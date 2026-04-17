<script setup lang="ts">
import { computed, ref } from "vue";
import type { CharacterWinRate } from "~/data/analytics";
import { useGameI18n } from "~/locales/lookup";

const props = defineProps<{
	characterStats: CharacterWinRate[];
	modelValue: string;
}>();

const emit = defineEmits<(e: "update:modelValue", value: string) => void>();

const { t } = useI18n();
const { characterName } = useGameI18n();

const displayText = computed(() =>
	props.modelValue ? characterName(props.modelValue) : t("run.allCharacters"),
);

const filteredCharacters = computed(() => props.characterStats);

const _optionsEl = ref<HTMLElement | null>(null);
const _innerEl = ref<HTMLElement | null>(null);
const _isVisible = ref(false);

function onEnter(el: Element, done: () => void) {
	const target = el as HTMLElement;
	const inner = target.querySelector(".combobox-options-inner") as HTMLElement;
	if (!inner) {
		done();
		return;
	}

	target.style.gridTemplateRows = "0fr";
	target.style.opacity = "0";
	inner.style.overflow = "hidden";

	requestAnimationFrame(() => {
		target.style.transition =
			"grid-template-rows 200ms ease-out, opacity 150ms ease-out";
		target.style.gridTemplateRows = "1fr";
		target.style.opacity = "1";
	});

	target.addEventListener(
		"transitionend",
		function handler(e: TransitionEvent) {
			if (e.propertyName === "grid-template-rows") {
				target.removeEventListener("transitionend", handler);
				inner.style.overflow = "";
				target.style.transition = "";
				target.style.gridTemplateRows = "";
				target.style.opacity = "";
				done();
			}
		},
	);
}

function onLeave(el: Element, done: () => void) {
	const target = el as HTMLElement;
	const inner = target.querySelector(".combobox-options-inner") as HTMLElement;
	if (!inner) {
		done();
		return;
	}

	inner.style.overflow = "hidden";
	target.style.transition =
		"grid-template-rows 120ms ease-in, opacity 80ms ease-in";
	target.style.gridTemplateRows = "0fr";
	target.style.opacity = "0";

	target.addEventListener(
		"transitionend",
		function handler(e: TransitionEvent) {
			if (e.propertyName === "grid-template-rows") {
				target.removeEventListener("transitionend", handler);
				inner.style.overflow = "";
				target.style.transition = "";
				target.style.gridTemplateRows = "";
				target.style.opacity = "";
				done();
			}
		},
	);
}
</script>

<template>
  <div class="character-filter">
    <Combobox :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)" as="div">
      <ComboboxButton class="combobox-trigger">
        <span class="combobox-label">{{ displayText }}</span>
        <ChevronDown class="combobox-icon" />
      </ComboboxButton>
      <Transition
        :css="false"
        @enter="onEnter"
        @leave="onLeave"
      >
        <ComboboxOptions class="character-combobox-options">
          <div class="combobox-options-inner">
            <ComboboxOption value="" class="character-combobox-option">
              {{ t('run.allCharacters') }}
            </ComboboxOption>
            <ComboboxOption
              v-for="char in filteredCharacters"
              :key="char.character"
              :value="char.character"
              class="character-combobox-option"
            >
              {{ characterName(char.character) }}
            </ComboboxOption>
          </div>
        </ComboboxOptions>
      </Transition>
    </Combobox>
  </div>
</template>

<style scoped lang="scss">
.character-filter {
  display: flex;
  align-items: center;
  font-size: 0.85rem;
  line-height: 1;
  padding-left: 0.85rem;
  position: relative;

  .combobox-trigger {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    cursor: pointer;
    background: none;
    border: none;
    padding: 0;
    color: $text-primary;
    font-size: 0.9rem;
    font-family: inherit;
    line-height: 1;
    outline: none;

    @include focus-ring;

    .combobox-icon {
      width: 1rem;
      height: 1rem;
      color: $text-secondary;
      transition: transform $transition-fast, color $transition-fast;
    }

    &:hover .combobox-icon {
      color: $text-primary;
    }

    [data-headlessui-state*="open"] .combobox-icon {
      transform: rotate(180deg);
    }
  }
}
</style>

<style lang="scss">
.character-combobox-options {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 0.2rem;
  min-width: 150px;
  background: rgba(10, 22, 40, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: $radius-md;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  z-index: 50;
  display: grid;
  grid-template-rows: 1fr;
}

.character-combobox-option {
  padding: 0.3rem 0.75rem;
  font-size: 0.85rem;
  color: $text-secondary;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
  white-space: nowrap;

  &:first-child {
    border-radius: $radius-md $radius-md 0 0;
  }

  &:last-child {
    border-radius: 0 0 $radius-md $radius-md;
  }

  &:only-child {
    border-radius: $radius-md;
  }

  &.ui-active,
  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: $text-primary;
  }

  &.ui-selected {
    color: $warn;
  }
}
</style>

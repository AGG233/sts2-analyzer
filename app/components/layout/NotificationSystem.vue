<script setup lang="ts">
import { Check, CircleAlert, Info, TriangleAlert, X } from "@lucide/vue";
import { useNotificationBus } from "~/lib/notifications";

const { notifications, removeNotification } = useNotificationBus();

const severityClasses: Record<string, string> = {
	success: "bg-green-500/90 border-green-400",
	info: "bg-blue-500/90 border-blue-400",
	warn: "bg-yellow-500/90 border-yellow-400",
	error: "bg-red-500/90 border-red-400",
};

const severityIcons = {
	success: Check,
	info: Info,
	warn: TriangleAlert,
	error: CircleAlert,
};
</script>

<template>
  <div class="notification-container fixed bottom-4 right-4 z-50 flex flex-col gap-2">
    <TransitionGroup name="notification">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        :class="[
          'min-w-[300px] max-w-[400px] rounded-lg border px-4 py-3 shadow-lg',
          severityClasses[notification.severity]
        ]"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-start gap-3">
            <component :is="severityIcons[notification.severity]" class="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
            <div>
              <div class="font-medium text-white">{{ notification.summary }}</div>
              <div v-if="notification.detail" class="text-sm text-white/80 mt-1">
                {{ notification.detail }}
              </div>
            </div>
          </div>
          <button
            class="text-white/70 hover:text-white flex-shrink-0"
            @click="removeNotification(notification.id)"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped lang="scss">
.notification-enter-active {
  animation: slideIn 0.3s ease-out;
}

.notification-leave-active {
  animation: slideOut 0.3s ease-in;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideOut {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(100%);
  }
}
</style>

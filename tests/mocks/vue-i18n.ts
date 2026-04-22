export function useI18n() {
	return {
		t: (key: string) => key,
		n: (count: number) => `${count}`,
		locale: { value: "en" },
	};
}

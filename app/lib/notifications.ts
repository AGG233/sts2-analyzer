import { readonly, ref } from "vue";

export type NotificationSeverity = "success" | "info" | "warn" | "error";

export interface AppNotificationInput {
	severity: NotificationSeverity;
	summary: string;
	detail?: string;
	life?: number;
}

export interface AppNotification extends Required<AppNotificationInput> {
	id: number;
}

const notificationsState = ref<AppNotification[]>([]);
let nextNotificationId = 1;

export function notifyApp(input: AppNotificationInput): number {
	const notification: AppNotification = {
		id: nextNotificationId++,
		life: input.life ?? 3000,
		detail: input.detail ?? "",
		severity: input.severity,
		summary: input.summary,
	};

	notificationsState.value.push(notification);

	if (notification.life > 0) {
		setTimeout(() => {
			removeNotification(notification.id);
		}, notification.life);
	}

	return notification.id;
}

export function removeNotification(id: number): void {
	const index = notificationsState.value.findIndex(
		(notification) => notification.id === id,
	);
	if (index !== -1) {
		notificationsState.value.splice(index, 1);
	}
}

export function clearNotifications(): void {
	notificationsState.value = [];
}

export function useNotificationBus() {
	return {
		notifications: readonly(notificationsState),
		notifyApp,
		removeNotification,
		clearNotifications,
	};
}

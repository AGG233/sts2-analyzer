import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	clearNotifications,
	notifyApp,
	removeNotification,
	useNotificationBus,
} from "~/lib/notifications";

describe("notifications", () => {
	beforeEach(() => {
		vi.useRealTimers();
		clearNotifications();
	});

	it("adds notifications with default values", () => {
		const { notifications } = useNotificationBus();

		const id = notifyApp({
			severity: "success",
			summary: "导入完成",
		});

		expect(id).toBeGreaterThan(0);
		expect(notifications.value).toEqual([
			expect.objectContaining({
				id,
				severity: "success",
				summary: "导入完成",
				detail: "",
				life: 3000,
			}),
		]);
	});

	it("removes notifications after their lifetime elapses", () => {
		vi.useFakeTimers();
		const { notifications } = useNotificationBus();

		notifyApp({
			severity: "info",
			summary: "扫描中",
			life: 1000,
		});

		expect(notifications.value).toHaveLength(1);
		vi.advanceTimersByTime(1000);
		expect(notifications.value).toHaveLength(0);
	});

	it("keeps persistent notifications until removed manually", () => {
		vi.useFakeTimers();
		const { notifications } = useNotificationBus();

		const id = notifyApp({
			severity: "warn",
			summary: "需要确认目录权限",
			life: 0,
		});

		vi.advanceTimersByTime(10_000);
		expect(notifications.value).toHaveLength(1);

		removeNotification(id);
		expect(notifications.value).toHaveLength(0);
	});

	it("clears all notifications at once", () => {
		const { notifications } = useNotificationBus();

		notifyApp({
			severity: "error",
			summary: "初始化失败",
		});
		notifyApp({
			severity: "info",
			summary: "正在重试",
		});

		expect(notifications.value).toHaveLength(2);
		clearNotifications();
		expect(notifications.value).toHaveLength(0);
	});
});

// src/lib/utils/enhancedWithToast.ts
import { toast } from 'svelte-sonner';

export function enhanceWithToast(opts: {
	onStart?: () => void;
	onEnd?: () => void;
	pending: string;
	successFallback: string;
	errorFallback: string;
}) {
	return () => {
		opts.onStart?.();
		let resolveFn: (v: any) => void;
		let rejectFn: (e: any) => void;
		const promise = new Promise((resolve, reject) => {
			resolveFn = resolve;
			rejectFn = reject;
		});

		toast.promise(promise, {
			loading: opts.pending,
			success: (msg: string) => msg,
			error: (msg: string) => msg,
		});

		return async ({ result, update }: any) => {
			opts.onEnd?.();
			if (result.type === 'failure') {
				rejectFn(result.data?.error ?? opts.errorFallback);
			} else {
				resolveFn(opts.successFallback);
			}
			await update();
		};
	};
}
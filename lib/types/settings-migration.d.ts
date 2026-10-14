/** Minimal, revision-fenced migration of stored Team fields; never Session policy. */
import type { Context } from '@deepseek-ai/cordis';
import type { Config } from './config.ts';
/** Coalesce startup/config edges into one in-flight write and one latest recheck. */
export declare function teamSettingsMigration(ctx: Context, config: Config, namespace: string): {
    request(): Promise<void>;
    dispose(): void;
};

window.__ModuleLoader__.load({
	id: "dsh-agent-team-presets",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");

		var _a$1;
		function $constructor(name, initializer, params) {
			function init(inst, def) {
				if (!inst._zod) Object.defineProperty(inst, "_zod", {
					value: {
						def,
						constr: _,
						traits: /* @__PURE__ */ new Set()
					},
					enumerable: false
				});
				if (inst._zod.traits.has(name)) return;
				inst._zod.traits.add(name);
				initializer(inst, def);
				const proto = _.prototype;
				const keys = Object.keys(proto);
				for (let i = 0; i < keys.length; i++) {
					const k = keys[i];
					if (!(k in inst)) inst[k] = proto[k].bind(inst);
				}
			}
			const Parent = params?.Parent ?? Object;
			class Definition extends Parent {}
			Object.defineProperty(Definition, "name", { value: name });
			function _(def) {
				var _a;
				const inst = params?.Parent ? new Definition() : this;
				init(inst, def);
				(_a = inst._zod).deferred ?? (_a.deferred = []);
				for (const fn of inst._zod.deferred) fn();
				return inst;
			}
			Object.defineProperty(_, "init", { value: init });
			Object.defineProperty(_, Symbol.hasInstance, { value: (inst) => {
				if (params?.Parent && inst instanceof params.Parent) return true;
				return inst?._zod?.traits?.has(name);
			} });
			Object.defineProperty(_, "name", { value: name });
			return _;
		}
		var $ZodAsyncError = class extends Error {
			constructor() {
				super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
			}
		};
		var $ZodEncodeError = class extends Error {
			constructor(name) {
				super(`Encountered unidirectional transform during encode: ${name}`);
				this.name = "ZodEncodeError";
			}
		};
		(_a$1 = globalThis).__zod_globalConfig ?? (_a$1.__zod_globalConfig = {});
		const globalConfig = globalThis.__zod_globalConfig;
		function config(newConfig) {
			if (newConfig) Object.assign(globalConfig, newConfig);
			return globalConfig;
		}
		function getEnumValues(entries) {
			const numericValues = Object.values(entries).filter((v) => typeof v === "number");
			return Object.entries(entries).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
		}
		function jsonStringifyReplacer(_, value) {
			if (typeof value === "bigint") return value.toString();
			return value;
		}
		function cached(getter) {
			return { get value() {
				{
					const value = getter();
					Object.defineProperty(this, "value", { value });
					return value;
				}
				throw new Error("cached value already set");
			} };
		}
		function nullish(input) {
			return input === null || input === void 0;
		}
		function cleanRegex(source) {
			const start = source.startsWith("^") ? 1 : 0;
			const end = source.endsWith("$") ? source.length - 1 : source.length;
			return source.slice(start, end);
		}
		function floatSafeRemainder(val, step) {
			const ratio = val / step;
			const roundedRatio = Math.round(ratio);
			const tolerance = Number.EPSILON * Math.max(Math.abs(ratio), 1);
			if (Math.abs(ratio - roundedRatio) < tolerance) return 0;
			return ratio - roundedRatio;
		}
		const EVALUATING = /* @__PURE__*/ Symbol("evaluating");
		function defineLazy(object, key, getter) {
			let value = void 0;
			Object.defineProperty(object, key, {
				get() {
					if (value === EVALUATING) return;
					if (value === void 0) {
						value = EVALUATING;
						value = getter();
					}
					return value;
				},
				set(v) {
					Object.defineProperty(object, key, { value: v });
				},
				configurable: true
			});
		}
		function assignProp(target, prop, value) {
			Object.defineProperty(target, prop, {
				value,
				writable: true,
				enumerable: true,
				configurable: true
			});
		}
		function mergeDefs(...defs) {
			const mergedDescriptors = {};
			for (const def of defs) Object.assign(mergedDescriptors, Object.getOwnPropertyDescriptors(def));
			return Object.defineProperties({}, mergedDescriptors);
		}
		function esc(str) {
			return JSON.stringify(str);
		}
		function slugify(input) {
			return input.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
		}
		const captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {};
		function isObject(data) {
			return typeof data === "object" && data !== null && !Array.isArray(data);
		}
		const allowsEval = /* @__PURE__*/ cached(() => {
			if (globalConfig.jitless) return false;
			if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) return false;
			try {
				new Function("");
				return true;
			} catch (_) {
				return false;
			}
		});
		function isPlainObject(o) {
			if (isObject(o) === false) return false;
			const ctor = o.constructor;
			if (ctor === void 0) return true;
			if (typeof ctor !== "function") return true;
			const prot = ctor.prototype;
			if (isObject(prot) === false) return false;
			if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) return false;
			return true;
		}
		function shallowClone(o) {
			if (isPlainObject(o)) return { ...o };
			if (Array.isArray(o)) return [...o];
			if (o instanceof Map) return new Map(o);
			if (o instanceof Set) return new Set(o);
			return o;
		}
		const propertyKeyTypes = /* @__PURE__*/ new Set([
			"string",
			"number",
			"symbol"
		]);
		function escapeRegex(str) {
			return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		}
		function clone(inst, def, params) {
			const cl = new inst._zod.constr(def ?? inst._zod.def);
			if (!def || params?.parent) cl._zod.parent = inst;
			return cl;
		}
		function normalizeParams(_params) {
			const params = _params;
			if (!params) return {};
			if (typeof params === "string") return { error: () => params };
			if (params?.message !== void 0) {
				if (params?.error !== void 0) throw new Error("Cannot specify both `message` and `error` params");
				params.error = params.message;
			}
			delete params.message;
			if (typeof params.error === "string") return {
				...params,
				error: () => params.error
			};
			return params;
		}
		function optionalKeys(shape) {
			return Object.keys(shape).filter((k) => {
				return shape[k]._zod.optin === "optional" && shape[k]._zod.optout === "optional";
			});
		}
		const NUMBER_FORMAT_RANGES = {
			safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
			int32: [-2147483648, 2147483647],
			uint32: [0, 4294967295],
			float32: [-34028234663852886e22, 34028234663852886e22],
			float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
		};
		function pick(schema, mask) {
			const currDef = schema._zod.def;
			const checks = currDef.checks;
			if (checks && checks.length > 0) throw new Error(".pick() cannot be used on object schemas containing refinements");
			return clone(schema, mergeDefs(schema._zod.def, {
				get shape() {
					const newShape = {};
					for (const key in mask) {
						if (!(key in currDef.shape)) throw new Error(`Unrecognized key: "${key}"`);
						if (!mask[key]) continue;
						newShape[key] = currDef.shape[key];
					}
					assignProp(this, "shape", newShape);
					return newShape;
				},
				checks: []
			}));
		}
		function omit(schema, mask) {
			const currDef = schema._zod.def;
			const checks = currDef.checks;
			if (checks && checks.length > 0) throw new Error(".omit() cannot be used on object schemas containing refinements");
			return clone(schema, mergeDefs(schema._zod.def, {
				get shape() {
					const newShape = { ...schema._zod.def.shape };
					for (const key in mask) {
						if (!(key in currDef.shape)) throw new Error(`Unrecognized key: "${key}"`);
						if (!mask[key]) continue;
						delete newShape[key];
					}
					assignProp(this, "shape", newShape);
					return newShape;
				},
				checks: []
			}));
		}
		function extend(schema, shape) {
			if (!isPlainObject(shape)) throw new Error("Invalid input to extend: expected a plain object");
			const checks = schema._zod.def.checks;
			if (checks && checks.length > 0) {
				const existingShape = schema._zod.def.shape;
				for (const key in shape) if (Object.getOwnPropertyDescriptor(existingShape, key) !== void 0) throw new Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
			}
			return clone(schema, mergeDefs(schema._zod.def, { get shape() {
				const _shape = {
					...schema._zod.def.shape,
					...shape
				};
				assignProp(this, "shape", _shape);
				return _shape;
			} }));
		}
		function safeExtend(schema, shape) {
			if (!isPlainObject(shape)) throw new Error("Invalid input to safeExtend: expected a plain object");
			return clone(schema, mergeDefs(schema._zod.def, { get shape() {
				const _shape = {
					...schema._zod.def.shape,
					...shape
				};
				assignProp(this, "shape", _shape);
				return _shape;
			} }));
		}
		function merge(a, b) {
			if (a._zod.def.checks?.length) throw new Error(".merge() cannot be used on object schemas containing refinements. Use .safeExtend() instead.");
			return clone(a, mergeDefs(a._zod.def, {
				get shape() {
					const _shape = {
						...a._zod.def.shape,
						...b._zod.def.shape
					};
					assignProp(this, "shape", _shape);
					return _shape;
				},
				get catchall() {
					return b._zod.def.catchall;
				},
				checks: b._zod.def.checks ?? []
			}));
		}
		function partial(Class, schema, mask) {
			const checks = schema._zod.def.checks;
			if (checks && checks.length > 0) throw new Error(".partial() cannot be used on object schemas containing refinements");
			return clone(schema, mergeDefs(schema._zod.def, {
				get shape() {
					const oldShape = schema._zod.def.shape;
					const shape = { ...oldShape };
					if (mask) for (const key in mask) {
						if (!(key in oldShape)) throw new Error(`Unrecognized key: "${key}"`);
						if (!mask[key]) continue;
						shape[key] = Class ? new Class({
							type: "optional",
							innerType: oldShape[key]
						}) : oldShape[key];
					}
					else for (const key in oldShape) shape[key] = Class ? new Class({
						type: "optional",
						innerType: oldShape[key]
					}) : oldShape[key];
					assignProp(this, "shape", shape);
					return shape;
				},
				checks: []
			}));
		}
		function required(Class, schema, mask) {
			return clone(schema, mergeDefs(schema._zod.def, { get shape() {
				const oldShape = schema._zod.def.shape;
				const shape = { ...oldShape };
				if (mask) for (const key in mask) {
					if (!(key in shape)) throw new Error(`Unrecognized key: "${key}"`);
					if (!mask[key]) continue;
					shape[key] = new Class({
						type: "nonoptional",
						innerType: oldShape[key]
					});
				}
				else for (const key in oldShape) shape[key] = new Class({
					type: "nonoptional",
					innerType: oldShape[key]
				});
				assignProp(this, "shape", shape);
				return shape;
			} }));
		}
		function aborted(x, startIndex = 0) {
			if (x.aborted === true) return true;
			for (let i = startIndex; i < x.issues.length; i++) if (x.issues[i]?.continue !== true) return true;
			return false;
		}
		function explicitlyAborted(x, startIndex = 0) {
			if (x.aborted === true) return true;
			for (let i = startIndex; i < x.issues.length; i++) if (x.issues[i]?.continue === false) return true;
			return false;
		}
		function prefixIssues(path, issues) {
			return issues.map((iss) => {
				var _a;
				(_a = iss).path ?? (_a.path = []);
				iss.path.unshift(path);
				return iss;
			});
		}
		function unwrapMessage(message) {
			return typeof message === "string" ? message : message?.message;
		}
		function finalizeIssue(iss, ctx, config) {
			const message = iss.message ? iss.message : unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config.customError?.(iss)) ?? unwrapMessage(config.localeError?.(iss)) ?? "Invalid input";
			const { inst: _inst, continue: _continue, input: _input, ...rest } = iss;
			rest.path ?? (rest.path = []);
			rest.message = message;
			if (ctx?.reportInput) rest.input = _input;
			return rest;
		}
		function getLengthableOrigin(input) {
			if (Array.isArray(input)) return "array";
			if (typeof input === "string") return "string";
			return "unknown";
		}
		function issue(...args) {
			const [iss, input, inst] = args;
			if (typeof iss === "string") return {
				message: iss,
				code: "custom",
				input,
				inst
			};
			return { ...iss };
		}
		const initializer$1 = (inst, def) => {
			inst.name = "$ZodError";
			Object.defineProperty(inst, "_zod", {
				value: inst._zod,
				enumerable: false
			});
			Object.defineProperty(inst, "issues", {
				value: def,
				enumerable: false
			});
			inst.message = JSON.stringify(def, jsonStringifyReplacer, 2);
			Object.defineProperty(inst, "toString", {
				value: () => inst.message,
				enumerable: false
			});
		};
		const $ZodError = $constructor("$ZodError", initializer$1);
		const $ZodRealError = $constructor("$ZodError", initializer$1, { Parent: Error });
		function flattenError(error, mapper = (issue) => issue.message) {
			const fieldErrors = {};
			const formErrors = [];
			for (const sub of error.issues) if (sub.path.length > 0) {
				fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
				fieldErrors[sub.path[0]].push(mapper(sub));
			} else formErrors.push(mapper(sub));
			return {
				formErrors,
				fieldErrors
			};
		}
		function formatError(error, mapper = (issue) => issue.message) {
			const fieldErrors = { _errors: [] };
			const processError = (error, path = []) => {
				for (const issue of error.issues) if (issue.code === "invalid_union" && issue.errors.length) issue.errors.map((issues) => processError({ issues }, [...path, ...issue.path]));
				else if (issue.code === "invalid_key") processError({ issues: issue.issues }, [...path, ...issue.path]);
				else if (issue.code === "invalid_element") processError({ issues: issue.issues }, [...path, ...issue.path]);
				else {
					const fullpath = [...path, ...issue.path];
					if (fullpath.length === 0) fieldErrors._errors.push(mapper(issue));
					else {
						let curr = fieldErrors;
						let i = 0;
						while (i < fullpath.length) {
							const el = fullpath[i];
							if (!(i === fullpath.length - 1)) curr[el] = curr[el] || { _errors: [] };
							else {
								curr[el] = curr[el] || { _errors: [] };
								curr[el]._errors.push(mapper(issue));
							}
							curr = curr[el];
							i++;
						}
					}
				}
			};
			processError(error);
			return fieldErrors;
		}
		const _parse = (_Err) => (schema, value, _ctx, _params) => {
			const ctx = _ctx ? {
				..._ctx,
				async: false
			} : { async: false };
			const result = schema._zod.run({
				value,
				issues: []
			}, ctx);
			if (result instanceof Promise) throw new $ZodAsyncError();
			if (result.issues.length) {
				const e = new ((_params?.Err) ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
				captureStackTrace(e, _params?.callee);
				throw e;
			}
			return result.value;
		};
		const _parseAsync = (_Err) => async (schema, value, _ctx, params) => {
			const ctx = _ctx ? {
				..._ctx,
				async: true
			} : { async: true };
			let result = schema._zod.run({
				value,
				issues: []
			}, ctx);
			if (result instanceof Promise) result = await result;
			if (result.issues.length) {
				const e = new ((params?.Err) ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
				captureStackTrace(e, params?.callee);
				throw e;
			}
			return result.value;
		};
		const _safeParse = (_Err) => (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				async: false
			} : { async: false };
			const result = schema._zod.run({
				value,
				issues: []
			}, ctx);
			if (result instanceof Promise) throw new $ZodAsyncError();
			return result.issues.length ? {
				success: false,
				error: new (_Err ?? $ZodError)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
			} : {
				success: true,
				data: result.value
			};
		};
		const safeParse$1 = /* @__PURE__*/ _safeParse($ZodRealError);
		const _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				async: true
			} : { async: true };
			let result = schema._zod.run({
				value,
				issues: []
			}, ctx);
			if (result instanceof Promise) result = await result;
			return result.issues.length ? {
				success: false,
				error: new _Err(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
			} : {
				success: true,
				data: result.value
			};
		};
		const safeParseAsync$1 = /* @__PURE__*/ _safeParseAsync($ZodRealError);
		const _encode = (_Err) => (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				direction: "backward"
			} : { direction: "backward" };
			return _parse(_Err)(schema, value, ctx);
		};
		const _decode = (_Err) => (schema, value, _ctx) => {
			return _parse(_Err)(schema, value, _ctx);
		};
		const _encodeAsync = (_Err) => async (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				direction: "backward"
			} : { direction: "backward" };
			return _parseAsync(_Err)(schema, value, ctx);
		};
		const _decodeAsync = (_Err) => async (schema, value, _ctx) => {
			return _parseAsync(_Err)(schema, value, _ctx);
		};
		const _safeEncode = (_Err) => (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				direction: "backward"
			} : { direction: "backward" };
			return _safeParse(_Err)(schema, value, ctx);
		};
		const _safeDecode = (_Err) => (schema, value, _ctx) => {
			return _safeParse(_Err)(schema, value, _ctx);
		};
		const _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				direction: "backward"
			} : { direction: "backward" };
			return _safeParseAsync(_Err)(schema, value, ctx);
		};
		const _safeDecodeAsync = (_Err) => async (schema, value, _ctx) => {
			return _safeParseAsync(_Err)(schema, value, _ctx);
		};
		/**
		* @deprecated CUID v1 is deprecated by its authors due to information leakage
		* (timestamps embedded in the id). Use {@link cuid2} instead.
		* See https://github.com/paralleldrive/cuid.
		*/
		const cuid = /^[cC][0-9a-z]{6,}$/;
		const cuid2 = /^[0-9a-z]+$/;
		const ulid = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;
		const xid = /^[0-9a-vA-V]{20}$/;
		const ksuid = /^[A-Za-z0-9]{27}$/;
		const nanoid = /^[a-zA-Z0-9_-]{21}$/;
		/** ISO 8601-1 duration regex. Does not support the 8601-2 extensions like negative durations or fractional/negative components. */
		const duration$1 = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
		/** A regex for any UUID-like identifier: 8-4-4-4-12 hex pattern */
		const guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
		/** Returns a regex for validating an RFC 9562/4122 UUID.
		*
		* @param version Optionally specify a version 1-8. If no version is specified, all versions are supported. */
		const uuid = (version) => {
			if (!version) return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
			return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
		};
		/** Practical email validation */
		const email = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
		const _emoji$1 = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
		function emoji() {
			return new RegExp(_emoji$1, "u");
		}
		const ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
		const ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
		const cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
		const cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
		const base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
		const base64url = /^[A-Za-z0-9_-]*$/;
		const httpProtocol = /^https?$/;
		const e164 = /^\+[1-9]\d{6,14}$/;
		const dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
		const date$1 = /*@__PURE__*/ new RegExp(`^${dateSource}$`);
		function timeSource(args) {
			const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
			return typeof args.precision === "number" ? args.precision === -1 ? `${hhmm}` : args.precision === 0 ? `${hhmm}:[0-5]\\d` : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}` : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
		}
		function time$1(args) {
			return new RegExp(`^${timeSource(args)}$`);
		}
		function datetime$1(args) {
			const time = timeSource({ precision: args.precision });
			const opts = ["Z"];
			if (args.local) opts.push("");
			if (args.offset) opts.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
			const timeRegex = `${time}(?:${opts.join("|")})`;
			return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
		}
		const string$1 = (params) => {
			const regex = params ? `[\\s\\S]{${params?.minimum ?? 0},${params?.maximum ?? ""}}` : `[\\s\\S]*`;
			return new RegExp(`^${regex}$`);
		};
		const integer = /^-?\d+$/;
		const number$1 = /^-?\d+(?:\.\d+)?$/;
		const boolean$1 = /^(?:true|false)$/i;
		const lowercase = /^[^A-Z]*$/;
		const uppercase = /^[^a-z]*$/;
		const $ZodCheck = /*@__PURE__*/ $constructor("$ZodCheck", (inst, def) => {
			var _a;
			inst._zod ?? (inst._zod = {});
			inst._zod.def = def;
			(_a = inst._zod).onattach ?? (_a.onattach = []);
		});
		const numericOriginMap = {
			number: "number",
			bigint: "bigint",
			object: "date"
		};
		const $ZodCheckLessThan = /*@__PURE__*/ $constructor("$ZodCheckLessThan", (inst, def) => {
			$ZodCheck.init(inst, def);
			const origin = numericOriginMap[typeof def.value];
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				const curr = (def.inclusive ? bag.maximum : bag.exclusiveMaximum) ?? Number.POSITIVE_INFINITY;
				if (def.value < curr) if (def.inclusive) bag.maximum = def.value;
				else bag.exclusiveMaximum = def.value;
			});
			inst._zod.check = (payload) => {
				if (def.inclusive ? payload.value <= def.value : payload.value < def.value) return;
				payload.issues.push({
					origin,
					code: "too_big",
					maximum: typeof def.value === "object" ? def.value.getTime() : def.value,
					input: payload.value,
					inclusive: def.inclusive,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckGreaterThan = /*@__PURE__*/ $constructor("$ZodCheckGreaterThan", (inst, def) => {
			$ZodCheck.init(inst, def);
			const origin = numericOriginMap[typeof def.value];
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				const curr = (def.inclusive ? bag.minimum : bag.exclusiveMinimum) ?? Number.NEGATIVE_INFINITY;
				if (def.value > curr) if (def.inclusive) bag.minimum = def.value;
				else bag.exclusiveMinimum = def.value;
			});
			inst._zod.check = (payload) => {
				if (def.inclusive ? payload.value >= def.value : payload.value > def.value) return;
				payload.issues.push({
					origin,
					code: "too_small",
					minimum: typeof def.value === "object" ? def.value.getTime() : def.value,
					input: payload.value,
					inclusive: def.inclusive,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckMultipleOf = /*@__PURE__*/ $constructor("$ZodCheckMultipleOf", (inst, def) => {
			$ZodCheck.init(inst, def);
			inst._zod.onattach.push((inst) => {
				var _a;
				(_a = inst._zod.bag).multipleOf ?? (_a.multipleOf = def.value);
			});
			inst._zod.check = (payload) => {
				if (typeof payload.value !== typeof def.value) throw new Error("Cannot mix number and bigint in multiple_of check.");
				if (typeof payload.value === "bigint" ? payload.value % def.value === BigInt(0) : floatSafeRemainder(payload.value, def.value) === 0) return;
				payload.issues.push({
					origin: typeof payload.value,
					code: "not_multiple_of",
					divisor: def.value,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckNumberFormat = /*@__PURE__*/ $constructor("$ZodCheckNumberFormat", (inst, def) => {
			$ZodCheck.init(inst, def);
			def.format = def.format || "float64";
			const isInt = def.format?.includes("int");
			const origin = isInt ? "int" : "number";
			const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.format = def.format;
				bag.minimum = minimum;
				bag.maximum = maximum;
				if (isInt) bag.pattern = integer;
			});
			inst._zod.check = (payload) => {
				const input = payload.value;
				if (isInt) {
					if (!Number.isInteger(input)) {
						payload.issues.push({
							expected: origin,
							format: def.format,
							code: "invalid_type",
							continue: false,
							input,
							inst
						});
						return;
					}
					if (!Number.isSafeInteger(input)) {
						if (input > 0) payload.issues.push({
							input,
							code: "too_big",
							maximum: Number.MAX_SAFE_INTEGER,
							note: "Integers must be within the safe integer range.",
							inst,
							origin,
							inclusive: true,
							continue: !def.abort
						});
						else payload.issues.push({
							input,
							code: "too_small",
							minimum: Number.MIN_SAFE_INTEGER,
							note: "Integers must be within the safe integer range.",
							inst,
							origin,
							inclusive: true,
							continue: !def.abort
						});
						return;
					}
				}
				if (input < minimum) payload.issues.push({
					origin: "number",
					input,
					code: "too_small",
					minimum,
					inclusive: true,
					inst,
					continue: !def.abort
				});
				if (input > maximum) payload.issues.push({
					origin: "number",
					input,
					code: "too_big",
					maximum,
					inclusive: true,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckMaxLength = /*@__PURE__*/ $constructor("$ZodCheckMaxLength", (inst, def) => {
			var _a;
			$ZodCheck.init(inst, def);
			(_a = inst._zod.def).when ?? (_a.when = (payload) => {
				const val = payload.value;
				return !nullish(val) && val.length !== void 0;
			});
			inst._zod.onattach.push((inst) => {
				const curr = inst._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
				if (def.maximum < curr) inst._zod.bag.maximum = def.maximum;
			});
			inst._zod.check = (payload) => {
				const input = payload.value;
				if (input.length <= def.maximum) return;
				const origin = getLengthableOrigin(input);
				payload.issues.push({
					origin,
					code: "too_big",
					maximum: def.maximum,
					inclusive: true,
					input,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckMinLength = /*@__PURE__*/ $constructor("$ZodCheckMinLength", (inst, def) => {
			var _a;
			$ZodCheck.init(inst, def);
			(_a = inst._zod.def).when ?? (_a.when = (payload) => {
				const val = payload.value;
				return !nullish(val) && val.length !== void 0;
			});
			inst._zod.onattach.push((inst) => {
				const curr = inst._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
				if (def.minimum > curr) inst._zod.bag.minimum = def.minimum;
			});
			inst._zod.check = (payload) => {
				const input = payload.value;
				if (input.length >= def.minimum) return;
				const origin = getLengthableOrigin(input);
				payload.issues.push({
					origin,
					code: "too_small",
					minimum: def.minimum,
					inclusive: true,
					input,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckLengthEquals = /*@__PURE__*/ $constructor("$ZodCheckLengthEquals", (inst, def) => {
			var _a;
			$ZodCheck.init(inst, def);
			(_a = inst._zod.def).when ?? (_a.when = (payload) => {
				const val = payload.value;
				return !nullish(val) && val.length !== void 0;
			});
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.minimum = def.length;
				bag.maximum = def.length;
				bag.length = def.length;
			});
			inst._zod.check = (payload) => {
				const input = payload.value;
				const length = input.length;
				if (length === def.length) return;
				const origin = getLengthableOrigin(input);
				const tooBig = length > def.length;
				payload.issues.push({
					origin,
					...tooBig ? {
						code: "too_big",
						maximum: def.length
					} : {
						code: "too_small",
						minimum: def.length
					},
					inclusive: true,
					exact: true,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckStringFormat = /*@__PURE__*/ $constructor("$ZodCheckStringFormat", (inst, def) => {
			var _a, _b;
			$ZodCheck.init(inst, def);
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.format = def.format;
				if (def.pattern) {
					bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
					bag.patterns.add(def.pattern);
				}
			});
			if (def.pattern) (_a = inst._zod).check ?? (_a.check = (payload) => {
				def.pattern.lastIndex = 0;
				if (def.pattern.test(payload.value)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: def.format,
					input: payload.value,
					...def.pattern ? { pattern: def.pattern.toString() } : {},
					inst,
					continue: !def.abort
				});
			});
			else (_b = inst._zod).check ?? (_b.check = () => {});
		});
		const $ZodCheckRegex = /*@__PURE__*/ $constructor("$ZodCheckRegex", (inst, def) => {
			$ZodCheckStringFormat.init(inst, def);
			inst._zod.check = (payload) => {
				def.pattern.lastIndex = 0;
				if (def.pattern.test(payload.value)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: "regex",
					input: payload.value,
					pattern: def.pattern.toString(),
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckLowerCase = /*@__PURE__*/ $constructor("$ZodCheckLowerCase", (inst, def) => {
			def.pattern ?? (def.pattern = lowercase);
			$ZodCheckStringFormat.init(inst, def);
		});
		const $ZodCheckUpperCase = /*@__PURE__*/ $constructor("$ZodCheckUpperCase", (inst, def) => {
			def.pattern ?? (def.pattern = uppercase);
			$ZodCheckStringFormat.init(inst, def);
		});
		const $ZodCheckIncludes = /*@__PURE__*/ $constructor("$ZodCheckIncludes", (inst, def) => {
			$ZodCheck.init(inst, def);
			const escapedRegex = escapeRegex(def.includes);
			const pattern = new RegExp(typeof def.position === "number" ? `^.{${def.position}}${escapedRegex}` : escapedRegex);
			def.pattern = pattern;
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
				bag.patterns.add(pattern);
			});
			inst._zod.check = (payload) => {
				if (payload.value.includes(def.includes, def.position)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: "includes",
					includes: def.includes,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckStartsWith = /*@__PURE__*/ $constructor("$ZodCheckStartsWith", (inst, def) => {
			$ZodCheck.init(inst, def);
			const pattern = new RegExp(`^${escapeRegex(def.prefix)}.*`);
			def.pattern ?? (def.pattern = pattern);
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
				bag.patterns.add(pattern);
			});
			inst._zod.check = (payload) => {
				if (payload.value.startsWith(def.prefix)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: "starts_with",
					prefix: def.prefix,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckEndsWith = /*@__PURE__*/ $constructor("$ZodCheckEndsWith", (inst, def) => {
			$ZodCheck.init(inst, def);
			const pattern = new RegExp(`.*${escapeRegex(def.suffix)}$`);
			def.pattern ?? (def.pattern = pattern);
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
				bag.patterns.add(pattern);
			});
			inst._zod.check = (payload) => {
				if (payload.value.endsWith(def.suffix)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: "ends_with",
					suffix: def.suffix,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckOverwrite = /*@__PURE__*/ $constructor("$ZodCheckOverwrite", (inst, def) => {
			$ZodCheck.init(inst, def);
			inst._zod.check = (payload) => {
				payload.value = def.tx(payload.value);
			};
		});
		var Doc = class {
			constructor(args = []) {
				this.content = [];
				this.indent = 0;
				if (this) this.args = args;
			}
			indented(fn) {
				this.indent += 1;
				fn(this);
				this.indent -= 1;
			}
			write(arg) {
				if (typeof arg === "function") {
					arg(this, { execution: "sync" });
					arg(this, { execution: "async" });
					return;
				}
				const lines = arg.split("\n").filter((x) => x);
				const minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
				const dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
				for (const line of dedented) this.content.push(line);
			}
			compile() {
				const F = Function;
				const args = this?.args;
				const lines = [...(this?.content ?? [``]).map((x) => `  ${x}`)];
				return new F(...args, lines.join("\n"));
			}
		};
		const version = {
			major: 4,
			minor: 4,
			patch: 3
		};
		const $ZodType = /*@__PURE__*/ $constructor("$ZodType", (inst, def) => {
			var _a;
			inst ?? (inst = {});
			inst._zod.def = def;
			inst._zod.bag = inst._zod.bag || {};
			inst._zod.version = version;
			const checks = [...inst._zod.def.checks ?? []];
			if (inst._zod.traits.has("$ZodCheck")) checks.unshift(inst);
			for (const ch of checks) for (const fn of ch._zod.onattach) fn(inst);
			if (checks.length === 0) {
				(_a = inst._zod).deferred ?? (_a.deferred = []);
				inst._zod.deferred?.push(() => {
					inst._zod.run = inst._zod.parse;
				});
			} else {
				const runChecks = (payload, checks, ctx) => {
					let isAborted = aborted(payload);
					let asyncResult;
					for (const ch of checks) {
						if (ch._zod.def.when) {
							if (explicitlyAborted(payload)) continue;
							if (!ch._zod.def.when(payload)) continue;
						} else if (isAborted) continue;
						const currLen = payload.issues.length;
						const _ = ch._zod.check(payload);
						if (_ instanceof Promise && ctx?.async === false) throw new $ZodAsyncError();
						if (asyncResult || _ instanceof Promise) asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
							await _;
							if (payload.issues.length === currLen) return;
							if (!isAborted) isAborted = aborted(payload, currLen);
						});
						else {
							if (payload.issues.length === currLen) continue;
							if (!isAborted) isAborted = aborted(payload, currLen);
						}
					}
					if (asyncResult) return asyncResult.then(() => {
						return payload;
					});
					return payload;
				};
				const handleCanaryResult = (canary, payload, ctx) => {
					if (aborted(canary)) {
						canary.aborted = true;
						return canary;
					}
					const checkResult = runChecks(payload, checks, ctx);
					if (checkResult instanceof Promise) {
						if (ctx.async === false) throw new $ZodAsyncError();
						return checkResult.then((checkResult) => inst._zod.parse(checkResult, ctx));
					}
					return inst._zod.parse(checkResult, ctx);
				};
				inst._zod.run = (payload, ctx) => {
					if (ctx.skipChecks) return inst._zod.parse(payload, ctx);
					if (ctx.direction === "backward") {
						const canary = inst._zod.parse({
							value: payload.value,
							issues: []
						}, {
							...ctx,
							skipChecks: true
						});
						if (canary instanceof Promise) return canary.then((canary) => {
							return handleCanaryResult(canary, payload, ctx);
						});
						return handleCanaryResult(canary, payload, ctx);
					}
					const result = inst._zod.parse(payload, ctx);
					if (result instanceof Promise) {
						if (ctx.async === false) throw new $ZodAsyncError();
						return result.then((result) => runChecks(result, checks, ctx));
					}
					return runChecks(result, checks, ctx);
				};
			}
			defineLazy(inst, "~standard", () => ({
				validate: (value) => {
					try {
						const r = safeParse$1(inst, value);
						return r.success ? { value: r.data } : { issues: r.error?.issues };
					} catch (_) {
						return safeParseAsync$1(inst, value).then((r) => r.success ? { value: r.data } : { issues: r.error?.issues });
					}
				},
				vendor: "zod",
				version: 1
			}));
		});
		const $ZodString = /*@__PURE__*/ $constructor("$ZodString", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.pattern = [...inst?._zod.bag?.patterns ?? []].pop() ?? string$1(inst._zod.bag);
			inst._zod.parse = (payload, _) => {
				if (def.coerce) try {
					payload.value = String(payload.value);
				} catch (_) {}
				if (typeof payload.value === "string") return payload;
				payload.issues.push({
					expected: "string",
					code: "invalid_type",
					input: payload.value,
					inst
				});
				return payload;
			};
		});
		const $ZodStringFormat = /*@__PURE__*/ $constructor("$ZodStringFormat", (inst, def) => {
			$ZodCheckStringFormat.init(inst, def);
			$ZodString.init(inst, def);
		});
		const $ZodGUID = /*@__PURE__*/ $constructor("$ZodGUID", (inst, def) => {
			def.pattern ?? (def.pattern = guid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodUUID = /*@__PURE__*/ $constructor("$ZodUUID", (inst, def) => {
			if (def.version) {
				const v = {
					v1: 1,
					v2: 2,
					v3: 3,
					v4: 4,
					v5: 5,
					v6: 6,
					v7: 7,
					v8: 8
				}[def.version];
				if (v === void 0) throw new Error(`Invalid UUID version: "${def.version}"`);
				def.pattern ?? (def.pattern = uuid(v));
			} else def.pattern ?? (def.pattern = uuid());
			$ZodStringFormat.init(inst, def);
		});
		const $ZodEmail = /*@__PURE__*/ $constructor("$ZodEmail", (inst, def) => {
			def.pattern ?? (def.pattern = email);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodURL = /*@__PURE__*/ $constructor("$ZodURL", (inst, def) => {
			$ZodStringFormat.init(inst, def);
			inst._zod.check = (payload) => {
				try {
					const trimmed = payload.value.trim();
					if (!def.normalize && def.protocol?.source === httpProtocol.source) {
						if (!/^https?:\/\//i.test(trimmed)) {
							payload.issues.push({
								code: "invalid_format",
								format: "url",
								note: "Invalid URL format",
								input: payload.value,
								inst,
								continue: !def.abort
							});
							return;
						}
					}
					const url = new URL(trimmed);
					if (def.hostname) {
						def.hostname.lastIndex = 0;
						if (!def.hostname.test(url.hostname)) payload.issues.push({
							code: "invalid_format",
							format: "url",
							note: "Invalid hostname",
							pattern: def.hostname.source,
							input: payload.value,
							inst,
							continue: !def.abort
						});
					}
					if (def.protocol) {
						def.protocol.lastIndex = 0;
						if (!def.protocol.test(url.protocol.endsWith(":") ? url.protocol.slice(0, -1) : url.protocol)) payload.issues.push({
							code: "invalid_format",
							format: "url",
							note: "Invalid protocol",
							pattern: def.protocol.source,
							input: payload.value,
							inst,
							continue: !def.abort
						});
					}
					if (def.normalize) payload.value = url.href;
					else payload.value = trimmed;
					return;
				} catch (_) {
					payload.issues.push({
						code: "invalid_format",
						format: "url",
						input: payload.value,
						inst,
						continue: !def.abort
					});
				}
			};
		});
		const $ZodEmoji = /*@__PURE__*/ $constructor("$ZodEmoji", (inst, def) => {
			def.pattern ?? (def.pattern = emoji());
			$ZodStringFormat.init(inst, def);
		});
		const $ZodNanoID = /*@__PURE__*/ $constructor("$ZodNanoID", (inst, def) => {
			def.pattern ?? (def.pattern = nanoid);
			$ZodStringFormat.init(inst, def);
		});
		/**
		* @deprecated CUID v1 is deprecated by its authors due to information leakage
		* (timestamps embedded in the id). Use {@link $ZodCUID2} instead.
		* See https://github.com/paralleldrive/cuid.
		*/
		const $ZodCUID = /*@__PURE__*/ $constructor("$ZodCUID", (inst, def) => {
			def.pattern ?? (def.pattern = cuid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodCUID2 = /*@__PURE__*/ $constructor("$ZodCUID2", (inst, def) => {
			def.pattern ?? (def.pattern = cuid2);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodULID = /*@__PURE__*/ $constructor("$ZodULID", (inst, def) => {
			def.pattern ?? (def.pattern = ulid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodXID = /*@__PURE__*/ $constructor("$ZodXID", (inst, def) => {
			def.pattern ?? (def.pattern = xid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodKSUID = /*@__PURE__*/ $constructor("$ZodKSUID", (inst, def) => {
			def.pattern ?? (def.pattern = ksuid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodISODateTime = /*@__PURE__*/ $constructor("$ZodISODateTime", (inst, def) => {
			def.pattern ?? (def.pattern = datetime$1(def));
			$ZodStringFormat.init(inst, def);
		});
		const $ZodISODate = /*@__PURE__*/ $constructor("$ZodISODate", (inst, def) => {
			def.pattern ?? (def.pattern = date$1);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodISOTime = /*@__PURE__*/ $constructor("$ZodISOTime", (inst, def) => {
			def.pattern ?? (def.pattern = time$1(def));
			$ZodStringFormat.init(inst, def);
		});
		const $ZodISODuration = /*@__PURE__*/ $constructor("$ZodISODuration", (inst, def) => {
			def.pattern ?? (def.pattern = duration$1);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodIPv4 = /*@__PURE__*/ $constructor("$ZodIPv4", (inst, def) => {
			def.pattern ?? (def.pattern = ipv4);
			$ZodStringFormat.init(inst, def);
			inst._zod.bag.format = `ipv4`;
		});
		const $ZodIPv6 = /*@__PURE__*/ $constructor("$ZodIPv6", (inst, def) => {
			def.pattern ?? (def.pattern = ipv6);
			$ZodStringFormat.init(inst, def);
			inst._zod.bag.format = `ipv6`;
			inst._zod.check = (payload) => {
				try {
					new URL(`http://[${payload.value}]`);
				} catch {
					payload.issues.push({
						code: "invalid_format",
						format: "ipv6",
						input: payload.value,
						inst,
						continue: !def.abort
					});
				}
			};
		});
		const $ZodCIDRv4 = /*@__PURE__*/ $constructor("$ZodCIDRv4", (inst, def) => {
			def.pattern ?? (def.pattern = cidrv4);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodCIDRv6 = /*@__PURE__*/ $constructor("$ZodCIDRv6", (inst, def) => {
			def.pattern ?? (def.pattern = cidrv6);
			$ZodStringFormat.init(inst, def);
			inst._zod.check = (payload) => {
				const parts = payload.value.split("/");
				try {
					if (parts.length !== 2) throw new Error();
					const [address, prefix] = parts;
					if (!prefix) throw new Error();
					const prefixNum = Number(prefix);
					if (`${prefixNum}` !== prefix) throw new Error();
					if (prefixNum < 0 || prefixNum > 128) throw new Error();
					new URL(`http://[${address}]`);
				} catch {
					payload.issues.push({
						code: "invalid_format",
						format: "cidrv6",
						input: payload.value,
						inst,
						continue: !def.abort
					});
				}
			};
		});
		function isValidBase64(data) {
			if (data === "") return true;
			if (/\s/.test(data)) return false;
			if (data.length % 4 !== 0) return false;
			try {
				atob(data);
				return true;
			} catch {
				return false;
			}
		}
		const $ZodBase64 = /*@__PURE__*/ $constructor("$ZodBase64", (inst, def) => {
			def.pattern ?? (def.pattern = base64);
			$ZodStringFormat.init(inst, def);
			inst._zod.bag.contentEncoding = "base64";
			inst._zod.check = (payload) => {
				if (isValidBase64(payload.value)) return;
				payload.issues.push({
					code: "invalid_format",
					format: "base64",
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		function isValidBase64URL(data) {
			if (!base64url.test(data)) return false;
			const base64 = data.replace(/[-_]/g, (c) => c === "-" ? "+" : "/");
			return isValidBase64(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
		}
		const $ZodBase64URL = /*@__PURE__*/ $constructor("$ZodBase64URL", (inst, def) => {
			def.pattern ?? (def.pattern = base64url);
			$ZodStringFormat.init(inst, def);
			inst._zod.bag.contentEncoding = "base64url";
			inst._zod.check = (payload) => {
				if (isValidBase64URL(payload.value)) return;
				payload.issues.push({
					code: "invalid_format",
					format: "base64url",
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodE164 = /*@__PURE__*/ $constructor("$ZodE164", (inst, def) => {
			def.pattern ?? (def.pattern = e164);
			$ZodStringFormat.init(inst, def);
		});
		function isValidJWT(token, algorithm = null) {
			try {
				const tokensParts = token.split(".");
				if (tokensParts.length !== 3) return false;
				const [header] = tokensParts;
				if (!header) return false;
				const parsedHeader = JSON.parse(atob(header));
				if ("typ" in parsedHeader && parsedHeader?.typ !== "JWT") return false;
				if (!parsedHeader.alg) return false;
				if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm)) return false;
				return true;
			} catch {
				return false;
			}
		}
		const $ZodJWT = /*@__PURE__*/ $constructor("$ZodJWT", (inst, def) => {
			$ZodStringFormat.init(inst, def);
			inst._zod.check = (payload) => {
				if (isValidJWT(payload.value, def.alg)) return;
				payload.issues.push({
					code: "invalid_format",
					format: "jwt",
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodNumber = /*@__PURE__*/ $constructor("$ZodNumber", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.pattern = inst._zod.bag.pattern ?? number$1;
			inst._zod.parse = (payload, _ctx) => {
				if (def.coerce) try {
					payload.value = Number(payload.value);
				} catch (_) {}
				const input = payload.value;
				if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) return payload;
				const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? "Infinity" : void 0 : void 0;
				payload.issues.push({
					expected: "number",
					code: "invalid_type",
					input,
					inst,
					...received ? { received } : {}
				});
				return payload;
			};
		});
		const $ZodNumberFormat = /*@__PURE__*/ $constructor("$ZodNumberFormat", (inst, def) => {
			$ZodCheckNumberFormat.init(inst, def);
			$ZodNumber.init(inst, def);
		});
		const $ZodBoolean = /*@__PURE__*/ $constructor("$ZodBoolean", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.pattern = boolean$1;
			inst._zod.parse = (payload, _ctx) => {
				if (def.coerce) try {
					payload.value = Boolean(payload.value);
				} catch (_) {}
				const input = payload.value;
				if (typeof input === "boolean") return payload;
				payload.issues.push({
					expected: "boolean",
					code: "invalid_type",
					input,
					inst
				});
				return payload;
			};
		});
		const $ZodUnknown = /*@__PURE__*/ $constructor("$ZodUnknown", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.parse = (payload) => payload;
		});
		const $ZodNever = /*@__PURE__*/ $constructor("$ZodNever", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.parse = (payload, _ctx) => {
				payload.issues.push({
					expected: "never",
					code: "invalid_type",
					input: payload.value,
					inst
				});
				return payload;
			};
		});
		function handleArrayResult(result, final, index) {
			if (result.issues.length) final.issues.push(...prefixIssues(index, result.issues));
			final.value[index] = result.value;
		}
		const $ZodArray = /*@__PURE__*/ $constructor("$ZodArray", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.parse = (payload, ctx) => {
				const input = payload.value;
				if (!Array.isArray(input)) {
					payload.issues.push({
						expected: "array",
						code: "invalid_type",
						input,
						inst
					});
					return payload;
				}
				payload.value = Array(input.length);
				const proms = [];
				for (let i = 0; i < input.length; i++) {
					const item = input[i];
					const result = def.element._zod.run({
						value: item,
						issues: []
					}, ctx);
					if (result instanceof Promise) proms.push(result.then((result) => handleArrayResult(result, payload, i)));
					else handleArrayResult(result, payload, i);
				}
				if (proms.length) return Promise.all(proms).then(() => payload);
				return payload;
			};
		});
		function handlePropertyResult(result, final, key, input, isOptionalIn, isOptionalOut) {
			const isPresent = key in input;
			if (result.issues.length) {
				if (isOptionalIn && isOptionalOut && !isPresent) return;
				final.issues.push(...prefixIssues(key, result.issues));
			}
			if (!isPresent && !isOptionalIn) {
				if (!result.issues.length) final.issues.push({
					code: "invalid_type",
					expected: "nonoptional",
					input: void 0,
					path: [key]
				});
				return;
			}
			if (result.value === void 0) {
				if (isPresent) final.value[key] = void 0;
			} else final.value[key] = result.value;
		}
		function normalizeDef(def) {
			const keys = Object.keys(def.shape);
			for (const k of keys) if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) throw new Error(`Invalid element at key "${k}": expected a Zod schema`);
			const okeys = optionalKeys(def.shape);
			return {
				...def,
				keys,
				keySet: new Set(keys),
				numKeys: keys.length,
				optionalKeys: new Set(okeys)
			};
		}
		function handleCatchall(proms, input, payload, ctx, def, inst) {
			const unrecognized = [];
			const keySet = def.keySet;
			const _catchall = def.catchall._zod;
			const t = _catchall.def.type;
			const isOptionalIn = _catchall.optin === "optional";
			const isOptionalOut = _catchall.optout === "optional";
			for (const key in input) {
				if (key === "__proto__") continue;
				if (keySet.has(key)) continue;
				if (t === "never") {
					unrecognized.push(key);
					continue;
				}
				const r = _catchall.run({
					value: input[key],
					issues: []
				}, ctx);
				if (r instanceof Promise) proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut)));
				else handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut);
			}
			if (unrecognized.length) payload.issues.push({
				code: "unrecognized_keys",
				keys: unrecognized,
				input,
				inst
			});
			if (!proms.length) return payload;
			return Promise.all(proms).then(() => {
				return payload;
			});
		}
		const $ZodObject = /*@__PURE__*/ $constructor("$ZodObject", (inst, def) => {
			$ZodType.init(inst, def);
			if (!Object.getOwnPropertyDescriptor(def, "shape")?.get) {
				const sh = def.shape;
				Object.defineProperty(def, "shape", { get: () => {
					const newSh = { ...sh };
					Object.defineProperty(def, "shape", { value: newSh });
					return newSh;
				} });
			}
			const _normalized = cached(() => normalizeDef(def));
			defineLazy(inst._zod, "propValues", () => {
				const shape = def.shape;
				const propValues = {};
				for (const key in shape) {
					const field = shape[key]._zod;
					if (field.values) {
						propValues[key] ?? (propValues[key] = /* @__PURE__ */ new Set());
						for (const v of field.values) propValues[key].add(v);
					}
				}
				return propValues;
			});
			const isObject$1 = isObject;
			const catchall = def.catchall;
			let value;
			inst._zod.parse = (payload, ctx) => {
				value ?? (value = _normalized.value);
				const input = payload.value;
				if (!isObject$1(input)) {
					payload.issues.push({
						expected: "object",
						code: "invalid_type",
						input,
						inst
					});
					return payload;
				}
				payload.value = {};
				const proms = [];
				const shape = value.shape;
				for (const key of value.keys) {
					const el = shape[key];
					const isOptionalIn = el._zod.optin === "optional";
					const isOptionalOut = el._zod.optout === "optional";
					const r = el._zod.run({
						value: input[key],
						issues: []
					}, ctx);
					if (r instanceof Promise) proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut)));
					else handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut);
				}
				if (!catchall) return proms.length ? Promise.all(proms).then(() => payload) : payload;
				return handleCatchall(proms, input, payload, ctx, _normalized.value, inst);
			};
		});
		const $ZodObjectJIT = /*@__PURE__*/ $constructor("$ZodObjectJIT", (inst, def) => {
			$ZodObject.init(inst, def);
			const superParse = inst._zod.parse;
			const _normalized = cached(() => normalizeDef(def));
			const generateFastpass = (shape) => {
				const doc = new Doc([
					"shape",
					"payload",
					"ctx"
				]);
				const normalized = _normalized.value;
				const parseStr = (key) => {
					const k = esc(key);
					return `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
				};
				doc.write(`const input = payload.value;`);
				const ids = Object.create(null);
				let counter = 0;
				for (const key of normalized.keys) ids[key] = `key_${counter++}`;
				doc.write(`const newResult = {};`);
				for (const key of normalized.keys) {
					const id = ids[key];
					const k = esc(key);
					const schema = shape[key];
					const isOptionalIn = schema?._zod?.optin === "optional";
					const isOptionalOut = schema?._zod?.optout === "optional";
					doc.write(`const ${id} = ${parseStr(key)};`);
					if (isOptionalIn && isOptionalOut) doc.write(`
        if (${id}.issues.length) {
          if (${k} in input) {
            payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
              ...iss,
              path: iss.path ? [${k}, ...iss.path] : [${k}]
            })));
          }
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
					else if (!isOptionalIn) doc.write(`
        const ${id}_present = ${k} in input;
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        if (!${id}_present && !${id}.issues.length) {
          payload.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: undefined,
            path: [${k}]
          });
        }

        if (${id}_present) {
          if (${id}.value === undefined) {
            newResult[${k}] = undefined;
          } else {
            newResult[${k}] = ${id}.value;
          }
        }

      `);
					else doc.write(`
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
				}
				doc.write(`payload.value = newResult;`);
				doc.write(`return payload;`);
				const fn = doc.compile();
				return (payload, ctx) => fn(shape, payload, ctx);
			};
			let fastpass;
			const isObject$2 = isObject;
			const jit = !globalConfig.jitless;
			const fastEnabled = jit && allowsEval.value;
			const catchall = def.catchall;
			let value;
			inst._zod.parse = (payload, ctx) => {
				value ?? (value = _normalized.value);
				const input = payload.value;
				if (!isObject$2(input)) {
					payload.issues.push({
						expected: "object",
						code: "invalid_type",
						input,
						inst
					});
					return payload;
				}
				if (jit && fastEnabled && ctx?.async === false && ctx.jitless !== true) {
					if (!fastpass) fastpass = generateFastpass(def.shape);
					payload = fastpass(payload, ctx);
					if (!catchall) return payload;
					return handleCatchall([], input, payload, ctx, value, inst);
				}
				return superParse(payload, ctx);
			};
		});
		function handleUnionResults(results, final, inst, ctx) {
			for (const result of results) if (result.issues.length === 0) {
				final.value = result.value;
				return final;
			}
			const nonaborted = results.filter((r) => !aborted(r));
			if (nonaborted.length === 1) {
				final.value = nonaborted[0].value;
				return nonaborted[0];
			}
			final.issues.push({
				code: "invalid_union",
				input: final.value,
				inst,
				errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
			});
			return final;
		}
		const $ZodUnion = /*@__PURE__*/ $constructor("$ZodUnion", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazy(inst._zod, "optin", () => def.options.some((o) => o._zod.optin === "optional") ? "optional" : void 0);
			defineLazy(inst._zod, "optout", () => def.options.some((o) => o._zod.optout === "optional") ? "optional" : void 0);
			defineLazy(inst._zod, "values", () => {
				if (def.options.every((o) => o._zod.values)) return new Set(def.options.flatMap((option) => Array.from(option._zod.values)));
			});
			defineLazy(inst._zod, "pattern", () => {
				if (def.options.every((o) => o._zod.pattern)) {
					const patterns = def.options.map((o) => o._zod.pattern);
					return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
				}
			});
			const first = def.options.length === 1 ? def.options[0]._zod.run : null;
			inst._zod.parse = (payload, ctx) => {
				if (first) return first(payload, ctx);
				let async = false;
				const results = [];
				for (const option of def.options) {
					const result = option._zod.run({
						value: payload.value,
						issues: []
					}, ctx);
					if (result instanceof Promise) {
						results.push(result);
						async = true;
					} else {
						if (result.issues.length === 0) return result;
						results.push(result);
					}
				}
				if (!async) return handleUnionResults(results, payload, inst, ctx);
				return Promise.all(results).then((results) => {
					return handleUnionResults(results, payload, inst, ctx);
				});
			};
		});
		const $ZodIntersection = /*@__PURE__*/ $constructor("$ZodIntersection", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.parse = (payload, ctx) => {
				const input = payload.value;
				const left = def.left._zod.run({
					value: input,
					issues: []
				}, ctx);
				const right = def.right._zod.run({
					value: input,
					issues: []
				}, ctx);
				if (left instanceof Promise || right instanceof Promise) return Promise.all([left, right]).then(([left, right]) => {
					return handleIntersectionResults(payload, left, right);
				});
				return handleIntersectionResults(payload, left, right);
			};
		});
		function mergeValues(a, b) {
			if (a === b) return {
				valid: true,
				data: a
			};
			if (a instanceof Date && b instanceof Date && +a === +b) return {
				valid: true,
				data: a
			};
			if (isPlainObject(a) && isPlainObject(b)) {
				const bKeys = Object.keys(b);
				const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
				const newObj = {
					...a,
					...b
				};
				for (const key of sharedKeys) {
					const sharedValue = mergeValues(a[key], b[key]);
					if (!sharedValue.valid) return {
						valid: false,
						mergeErrorPath: [key, ...sharedValue.mergeErrorPath]
					};
					newObj[key] = sharedValue.data;
				}
				return {
					valid: true,
					data: newObj
				};
			}
			if (Array.isArray(a) && Array.isArray(b)) {
				if (a.length !== b.length) return {
					valid: false,
					mergeErrorPath: []
				};
				const newArray = [];
				for (let index = 0; index < a.length; index++) {
					const itemA = a[index];
					const itemB = b[index];
					const sharedValue = mergeValues(itemA, itemB);
					if (!sharedValue.valid) return {
						valid: false,
						mergeErrorPath: [index, ...sharedValue.mergeErrorPath]
					};
					newArray.push(sharedValue.data);
				}
				return {
					valid: true,
					data: newArray
				};
			}
			return {
				valid: false,
				mergeErrorPath: []
			};
		}
		function handleIntersectionResults(result, left, right) {
			const unrecKeys = /* @__PURE__ */ new Map();
			let unrecIssue;
			for (const iss of left.issues) if (iss.code === "unrecognized_keys") {
				unrecIssue ?? (unrecIssue = iss);
				for (const k of iss.keys) {
					if (!unrecKeys.has(k)) unrecKeys.set(k, {});
					unrecKeys.get(k).l = true;
				}
			} else result.issues.push(iss);
			for (const iss of right.issues) if (iss.code === "unrecognized_keys") for (const k of iss.keys) {
				if (!unrecKeys.has(k)) unrecKeys.set(k, {});
				unrecKeys.get(k).r = true;
			}
			else result.issues.push(iss);
			const bothKeys = [...unrecKeys].filter(([, f]) => f.l && f.r).map(([k]) => k);
			if (bothKeys.length && unrecIssue) result.issues.push({
				...unrecIssue,
				keys: bothKeys
			});
			if (aborted(result)) return result;
			const merged = mergeValues(left.value, right.value);
			if (!merged.valid) throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(merged.mergeErrorPath)}`);
			result.value = merged.data;
			return result;
		}
		const $ZodEnum = /*@__PURE__*/ $constructor("$ZodEnum", (inst, def) => {
			$ZodType.init(inst, def);
			const values = getEnumValues(def.entries);
			const valuesSet = new Set(values);
			inst._zod.values = valuesSet;
			inst._zod.pattern = new RegExp(`^(${values.filter((k) => propertyKeyTypes.has(typeof k)).map((o) => typeof o === "string" ? escapeRegex(o) : o.toString()).join("|")})$`);
			inst._zod.parse = (payload, _ctx) => {
				const input = payload.value;
				if (valuesSet.has(input)) return payload;
				payload.issues.push({
					code: "invalid_value",
					values,
					input,
					inst
				});
				return payload;
			};
		});
		const $ZodLiteral = /*@__PURE__*/ $constructor("$ZodLiteral", (inst, def) => {
			$ZodType.init(inst, def);
			if (def.values.length === 0) throw new Error("Cannot create literal schema with no valid values");
			const values = new Set(def.values);
			inst._zod.values = values;
			inst._zod.pattern = new RegExp(`^(${def.values.map((o) => typeof o === "string" ? escapeRegex(o) : o ? escapeRegex(o.toString()) : String(o)).join("|")})$`);
			inst._zod.parse = (payload, _ctx) => {
				const input = payload.value;
				if (values.has(input)) return payload;
				payload.issues.push({
					code: "invalid_value",
					values: def.values,
					input,
					inst
				});
				return payload;
			};
		});
		const $ZodTransform = /*@__PURE__*/ $constructor("$ZodTransform", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "optional";
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") throw new $ZodEncodeError(inst.constructor.name);
				const _out = def.transform(payload.value, payload);
				if (ctx.async) return (_out instanceof Promise ? _out : Promise.resolve(_out)).then((output) => {
					payload.value = output;
					payload.fallback = true;
					return payload;
				});
				if (_out instanceof Promise) throw new $ZodAsyncError();
				payload.value = _out;
				payload.fallback = true;
				return payload;
			};
		});
		function handleOptionalResult(result, input) {
			if (input === void 0 && (result.issues.length || result.fallback)) return {
				issues: [],
				value: void 0
			};
			return result;
		}
		const $ZodOptional = /*@__PURE__*/ $constructor("$ZodOptional", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "optional";
			inst._zod.optout = "optional";
			defineLazy(inst._zod, "values", () => {
				return def.innerType._zod.values ? new Set([...def.innerType._zod.values, void 0]) : void 0;
			});
			defineLazy(inst._zod, "pattern", () => {
				const pattern = def.innerType._zod.pattern;
				return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : void 0;
			});
			inst._zod.parse = (payload, ctx) => {
				if (def.innerType._zod.optin === "optional") {
					const input = payload.value;
					const result = def.innerType._zod.run(payload, ctx);
					if (result instanceof Promise) return result.then((r) => handleOptionalResult(r, input));
					return handleOptionalResult(result, input);
				}
				if (payload.value === void 0) return payload;
				return def.innerType._zod.run(payload, ctx);
			};
		});
		const $ZodExactOptional = /*@__PURE__*/ $constructor("$ZodExactOptional", (inst, def) => {
			$ZodOptional.init(inst, def);
			defineLazy(inst._zod, "values", () => def.innerType._zod.values);
			defineLazy(inst._zod, "pattern", () => def.innerType._zod.pattern);
			inst._zod.parse = (payload, ctx) => {
				return def.innerType._zod.run(payload, ctx);
			};
		});
		const $ZodNullable = /*@__PURE__*/ $constructor("$ZodNullable", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
			defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
			defineLazy(inst._zod, "pattern", () => {
				const pattern = def.innerType._zod.pattern;
				return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : void 0;
			});
			defineLazy(inst._zod, "values", () => {
				return def.innerType._zod.values ? new Set([...def.innerType._zod.values, null]) : void 0;
			});
			inst._zod.parse = (payload, ctx) => {
				if (payload.value === null) return payload;
				return def.innerType._zod.run(payload, ctx);
			};
		});
		const $ZodDefault = /*@__PURE__*/ $constructor("$ZodDefault", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "optional";
			defineLazy(inst._zod, "values", () => def.innerType._zod.values);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
				if (payload.value === void 0) {
					payload.value = def.defaultValue;
					/**
					* $ZodDefault returns the default value immediately in forward direction.
					* It doesn't pass the default value into the validator ("prefault"). There's no reason to pass the default value through validation. The validity of the default is enforced by TypeScript statically. Otherwise, it's the responsibility of the user to ensure the default is valid. In the case of pipes with divergent in/out types, you can specify the default on the `in` schema of your ZodPipe to set a "prefault" for the pipe.   */
					return payload;
				}
				const result = def.innerType._zod.run(payload, ctx);
				if (result instanceof Promise) return result.then((result) => handleDefaultResult(result, def));
				return handleDefaultResult(result, def);
			};
		});
		function handleDefaultResult(payload, def) {
			if (payload.value === void 0) payload.value = def.defaultValue;
			return payload;
		}
		const $ZodPrefault = /*@__PURE__*/ $constructor("$ZodPrefault", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "optional";
			defineLazy(inst._zod, "values", () => def.innerType._zod.values);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
				if (payload.value === void 0) payload.value = def.defaultValue;
				return def.innerType._zod.run(payload, ctx);
			};
		});
		const $ZodNonOptional = /*@__PURE__*/ $constructor("$ZodNonOptional", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazy(inst._zod, "values", () => {
				const v = def.innerType._zod.values;
				return v ? new Set([...v].filter((x) => x !== void 0)) : void 0;
			});
			inst._zod.parse = (payload, ctx) => {
				const result = def.innerType._zod.run(payload, ctx);
				if (result instanceof Promise) return result.then((result) => handleNonOptionalResult(result, inst));
				return handleNonOptionalResult(result, inst);
			};
		});
		function handleNonOptionalResult(payload, inst) {
			if (!payload.issues.length && payload.value === void 0) payload.issues.push({
				code: "invalid_type",
				expected: "nonoptional",
				input: payload.value,
				inst
			});
			return payload;
		}
		const $ZodCatch = /*@__PURE__*/ $constructor("$ZodCatch", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "optional";
			defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
			defineLazy(inst._zod, "values", () => def.innerType._zod.values);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
				const result = def.innerType._zod.run(payload, ctx);
				if (result instanceof Promise) return result.then((result) => {
					payload.value = result.value;
					if (result.issues.length) {
						payload.value = def.catchValue({
							...payload,
							error: { issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config())) },
							input: payload.value
						});
						payload.issues = [];
						payload.fallback = true;
					}
					return payload;
				});
				payload.value = result.value;
				if (result.issues.length) {
					payload.value = def.catchValue({
						...payload,
						error: { issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config())) },
						input: payload.value
					});
					payload.issues = [];
					payload.fallback = true;
				}
				return payload;
			};
		});
		const $ZodPipe = /*@__PURE__*/ $constructor("$ZodPipe", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazy(inst._zod, "values", () => def.in._zod.values);
			defineLazy(inst._zod, "optin", () => def.in._zod.optin);
			defineLazy(inst._zod, "optout", () => def.out._zod.optout);
			defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") {
					const right = def.out._zod.run(payload, ctx);
					if (right instanceof Promise) return right.then((right) => handlePipeResult(right, def.in, ctx));
					return handlePipeResult(right, def.in, ctx);
				}
				const left = def.in._zod.run(payload, ctx);
				if (left instanceof Promise) return left.then((left) => handlePipeResult(left, def.out, ctx));
				return handlePipeResult(left, def.out, ctx);
			};
		});
		function handlePipeResult(left, next, ctx) {
			if (left.issues.length) {
				left.aborted = true;
				return left;
			}
			return next._zod.run({
				value: left.value,
				issues: left.issues,
				fallback: left.fallback
			}, ctx);
		}
		const $ZodReadonly = /*@__PURE__*/ $constructor("$ZodReadonly", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazy(inst._zod, "propValues", () => def.innerType._zod.propValues);
			defineLazy(inst._zod, "values", () => def.innerType._zod.values);
			defineLazy(inst._zod, "optin", () => def.innerType?._zod?.optin);
			defineLazy(inst._zod, "optout", () => def.innerType?._zod?.optout);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
				const result = def.innerType._zod.run(payload, ctx);
				if (result instanceof Promise) return result.then(handleReadonlyResult);
				return handleReadonlyResult(result);
			};
		});
		function handleReadonlyResult(payload) {
			payload.value = Object.freeze(payload.value);
			return payload;
		}
		const $ZodCustom = /*@__PURE__*/ $constructor("$ZodCustom", (inst, def) => {
			$ZodCheck.init(inst, def);
			$ZodType.init(inst, def);
			inst._zod.parse = (payload, _) => {
				return payload;
			};
			inst._zod.check = (payload) => {
				const input = payload.value;
				const r = def.fn(input);
				if (r instanceof Promise) return r.then((r) => handleRefineResult(r, payload, input, inst));
				handleRefineResult(r, payload, input, inst);
			};
		});
		function handleRefineResult(result, payload, input, inst) {
			if (!result) {
				const _iss = {
					code: "custom",
					input,
					inst,
					path: [...inst._zod.def.path ?? []],
					continue: !inst._zod.def.abort
				};
				if (inst._zod.def.params) _iss.params = inst._zod.def.params;
				payload.issues.push(issue(_iss));
			}
		}
		var _a;
		var $ZodRegistry = class {
			constructor() {
				this._map = /* @__PURE__ */ new WeakMap();
				this._idmap = /* @__PURE__ */ new Map();
			}
			add(schema, ..._meta) {
				const meta = _meta[0];
				this._map.set(schema, meta);
				if (meta && typeof meta === "object" && "id" in meta) this._idmap.set(meta.id, schema);
				return this;
			}
			clear() {
				this._map = /* @__PURE__ */ new WeakMap();
				this._idmap = /* @__PURE__ */ new Map();
				return this;
			}
			remove(schema) {
				const meta = this._map.get(schema);
				if (meta && typeof meta === "object" && "id" in meta) this._idmap.delete(meta.id);
				this._map.delete(schema);
				return this;
			}
			get(schema) {
				const p = schema._zod.parent;
				if (p) {
					const pm = { ...this.get(p) ?? {} };
					delete pm.id;
					const f = {
						...pm,
						...this._map.get(schema)
					};
					return Object.keys(f).length ? f : void 0;
				}
				return this._map.get(schema);
			}
			has(schema) {
				return this._map.has(schema);
			}
		};
		function registry() {
			return new $ZodRegistry();
		}
		(_a = globalThis).__zod_globalRegistry ?? (_a.__zod_globalRegistry = registry());
		const globalRegistry = globalThis.__zod_globalRegistry;
		// @__NO_SIDE_EFFECTS__
		function _string(Class, params) {
			return new Class({
				type: "string",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _email(Class, params) {
			return new Class({
				type: "string",
				format: "email",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _guid(Class, params) {
			return new Class({
				type: "string",
				format: "guid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uuid(Class, params) {
			return new Class({
				type: "string",
				format: "uuid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uuidv4(Class, params) {
			return new Class({
				type: "string",
				format: "uuid",
				check: "string_format",
				abort: false,
				version: "v4",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uuidv6(Class, params) {
			return new Class({
				type: "string",
				format: "uuid",
				check: "string_format",
				abort: false,
				version: "v6",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uuidv7(Class, params) {
			return new Class({
				type: "string",
				format: "uuid",
				check: "string_format",
				abort: false,
				version: "v7",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _url(Class, params) {
			return new Class({
				type: "string",
				format: "url",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _emoji(Class, params) {
			return new Class({
				type: "string",
				format: "emoji",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _nanoid(Class, params) {
			return new Class({
				type: "string",
				format: "nanoid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		/**
		* @deprecated CUID v1 is deprecated by its authors due to information leakage
		* (timestamps embedded in the id). Use {@link _cuid2} instead.
		* See https://github.com/paralleldrive/cuid.
		*/
		// @__NO_SIDE_EFFECTS__
		function _cuid(Class, params) {
			return new Class({
				type: "string",
				format: "cuid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _cuid2(Class, params) {
			return new Class({
				type: "string",
				format: "cuid2",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _ulid(Class, params) {
			return new Class({
				type: "string",
				format: "ulid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _xid(Class, params) {
			return new Class({
				type: "string",
				format: "xid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _ksuid(Class, params) {
			return new Class({
				type: "string",
				format: "ksuid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _ipv4(Class, params) {
			return new Class({
				type: "string",
				format: "ipv4",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _ipv6(Class, params) {
			return new Class({
				type: "string",
				format: "ipv6",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _cidrv4(Class, params) {
			return new Class({
				type: "string",
				format: "cidrv4",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _cidrv6(Class, params) {
			return new Class({
				type: "string",
				format: "cidrv6",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _base64(Class, params) {
			return new Class({
				type: "string",
				format: "base64",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _base64url(Class, params) {
			return new Class({
				type: "string",
				format: "base64url",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _e164(Class, params) {
			return new Class({
				type: "string",
				format: "e164",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _jwt(Class, params) {
			return new Class({
				type: "string",
				format: "jwt",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _isoDateTime(Class, params) {
			return new Class({
				type: "string",
				format: "datetime",
				check: "string_format",
				offset: false,
				local: false,
				precision: null,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _isoDate(Class, params) {
			return new Class({
				type: "string",
				format: "date",
				check: "string_format",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _isoTime(Class, params) {
			return new Class({
				type: "string",
				format: "time",
				check: "string_format",
				precision: null,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _isoDuration(Class, params) {
			return new Class({
				type: "string",
				format: "duration",
				check: "string_format",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _number(Class, params) {
			return new Class({
				type: "number",
				checks: [],
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _int(Class, params) {
			return new Class({
				type: "number",
				check: "number_format",
				abort: false,
				format: "safeint",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _boolean(Class, params) {
			return new Class({
				type: "boolean",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _unknown(Class) {
			return new Class({ type: "unknown" });
		}
		// @__NO_SIDE_EFFECTS__
		function _never(Class, params) {
			return new Class({
				type: "never",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _lt(value, params) {
			return new $ZodCheckLessThan({
				check: "less_than",
				...normalizeParams(params),
				value,
				inclusive: false
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _lte(value, params) {
			return new $ZodCheckLessThan({
				check: "less_than",
				...normalizeParams(params),
				value,
				inclusive: true
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _gt(value, params) {
			return new $ZodCheckGreaterThan({
				check: "greater_than",
				...normalizeParams(params),
				value,
				inclusive: false
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _gte(value, params) {
			return new $ZodCheckGreaterThan({
				check: "greater_than",
				...normalizeParams(params),
				value,
				inclusive: true
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _multipleOf(value, params) {
			return new $ZodCheckMultipleOf({
				check: "multiple_of",
				...normalizeParams(params),
				value
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _maxLength(maximum, params) {
			return new $ZodCheckMaxLength({
				check: "max_length",
				...normalizeParams(params),
				maximum
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _minLength(minimum, params) {
			return new $ZodCheckMinLength({
				check: "min_length",
				...normalizeParams(params),
				minimum
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _length(length, params) {
			return new $ZodCheckLengthEquals({
				check: "length_equals",
				...normalizeParams(params),
				length
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _regex(pattern, params) {
			return new $ZodCheckRegex({
				check: "string_format",
				format: "regex",
				...normalizeParams(params),
				pattern
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _lowercase(params) {
			return new $ZodCheckLowerCase({
				check: "string_format",
				format: "lowercase",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uppercase(params) {
			return new $ZodCheckUpperCase({
				check: "string_format",
				format: "uppercase",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _includes(includes, params) {
			return new $ZodCheckIncludes({
				check: "string_format",
				format: "includes",
				...normalizeParams(params),
				includes
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _startsWith(prefix, params) {
			return new $ZodCheckStartsWith({
				check: "string_format",
				format: "starts_with",
				...normalizeParams(params),
				prefix
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _endsWith(suffix, params) {
			return new $ZodCheckEndsWith({
				check: "string_format",
				format: "ends_with",
				...normalizeParams(params),
				suffix
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _overwrite(tx) {
			return new $ZodCheckOverwrite({
				check: "overwrite",
				tx
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _normalize(form) {
			return /* @__PURE__ */ _overwrite((input) => input.normalize(form));
		}
		// @__NO_SIDE_EFFECTS__
		function _trim() {
			return /* @__PURE__ */ _overwrite((input) => input.trim());
		}
		// @__NO_SIDE_EFFECTS__
		function _toLowerCase() {
			return /* @__PURE__ */ _overwrite((input) => input.toLowerCase());
		}
		// @__NO_SIDE_EFFECTS__
		function _toUpperCase() {
			return /* @__PURE__ */ _overwrite((input) => input.toUpperCase());
		}
		// @__NO_SIDE_EFFECTS__
		function _slugify() {
			return /* @__PURE__ */ _overwrite((input) => slugify(input));
		}
		// @__NO_SIDE_EFFECTS__
		function _array(Class, element, params) {
			return new Class({
				type: "array",
				element,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _refine(Class, fn, _params) {
			return new Class({
				type: "custom",
				check: "custom",
				fn,
				...normalizeParams(_params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _superRefine(fn, params) {
			const ch = /* @__PURE__ */ _check((payload) => {
				payload.addIssue = (issue$2) => {
					if (typeof issue$2 === "string") payload.issues.push(issue(issue$2, payload.value, ch._zod.def));
					else {
						const _issue = issue$2;
						if (_issue.fatal) _issue.continue = false;
						_issue.code ?? (_issue.code = "custom");
						_issue.input ?? (_issue.input = payload.value);
						_issue.inst ?? (_issue.inst = ch);
						_issue.continue ?? (_issue.continue = !ch._zod.def.abort);
						payload.issues.push(issue(_issue));
					}
				};
				return fn(payload.value, payload);
			}, params);
			return ch;
		}
		// @__NO_SIDE_EFFECTS__
		function _check(fn, params) {
			const ch = new $ZodCheck({
				check: "custom",
				...normalizeParams(params)
			});
			ch._zod.check = fn;
			return ch;
		}
		function initializeContext(params) {
			let target = params?.target ?? "draft-2020-12";
			if (target === "draft-4") target = "draft-04";
			if (target === "draft-7") target = "draft-07";
			return {
				processors: params.processors ?? {},
				metadataRegistry: params?.metadata ?? globalRegistry,
				target,
				unrepresentable: params?.unrepresentable ?? "throw",
				override: params?.override ?? (() => {}),
				io: params?.io ?? "output",
				counter: 0,
				seen: /* @__PURE__ */ new Map(),
				cycles: params?.cycles ?? "ref",
				reused: params?.reused ?? "inline",
				external: params?.external ?? void 0
			};
		}
		function process(schema, ctx, _params = {
			path: [],
			schemaPath: []
		}) {
			var _a;
			const def = schema._zod.def;
			const seen = ctx.seen.get(schema);
			if (seen) {
				seen.count++;
				if (_params.schemaPath.includes(schema)) seen.cycle = _params.path;
				return seen.schema;
			}
			const result = {
				schema: {},
				count: 1,
				cycle: void 0,
				path: _params.path
			};
			ctx.seen.set(schema, result);
			const overrideSchema = schema._zod.toJSONSchema?.();
			if (overrideSchema) result.schema = overrideSchema;
			else {
				const params = {
					..._params,
					schemaPath: [..._params.schemaPath, schema],
					path: _params.path
				};
				if (schema._zod.processJSONSchema) schema._zod.processJSONSchema(ctx, result.schema, params);
				else {
					const _json = result.schema;
					const processor = ctx.processors[def.type];
					if (!processor) throw new Error(`[toJSONSchema]: Non-representable type encountered: ${def.type}`);
					processor(schema, ctx, _json, params);
				}
				const parent = schema._zod.parent;
				if (parent) {
					if (!result.ref) result.ref = parent;
					process(parent, ctx, params);
					ctx.seen.get(parent).isParent = true;
				}
			}
			const meta = ctx.metadataRegistry.get(schema);
			if (meta) Object.assign(result.schema, meta);
			if (ctx.io === "input" && isTransforming(schema)) {
				delete result.schema.examples;
				delete result.schema.default;
			}
			if (ctx.io === "input" && "_prefault" in result.schema) (_a = result.schema).default ?? (_a.default = result.schema._prefault);
			delete result.schema._prefault;
			return ctx.seen.get(schema).schema;
		}
		function extractDefs(ctx, schema) {
			const root = ctx.seen.get(schema);
			if (!root) throw new Error("Unprocessed schema. This is a bug in Zod.");
			const idToSchema = /* @__PURE__ */ new Map();
			for (const entry of ctx.seen.entries()) {
				const id = ctx.metadataRegistry.get(entry[0])?.id;
				if (id) {
					const existing = idToSchema.get(id);
					if (existing && existing !== entry[0]) throw new Error(`Duplicate schema id "${id}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
					idToSchema.set(id, entry[0]);
				}
			}
			const makeURI = (entry) => {
				const defsSegment = ctx.target === "draft-2020-12" ? "$defs" : "definitions";
				if (ctx.external) {
					const externalId = ctx.external.registry.get(entry[0])?.id;
					const uriGenerator = ctx.external.uri ?? ((id) => id);
					if (externalId) return { ref: uriGenerator(externalId) };
					const id = entry[1].defId ?? entry[1].schema.id ?? `schema${ctx.counter++}`;
					entry[1].defId = id;
					return {
						defId: id,
						ref: `${uriGenerator("__shared")}#/${defsSegment}/${id}`
					};
				}
				if (entry[1] === root) return { ref: "#" };
				const defUriPrefix = `#/${defsSegment}/`;
				const defId = entry[1].schema.id ?? `__schema${ctx.counter++}`;
				return {
					defId,
					ref: defUriPrefix + defId
				};
			};
			const extractToDef = (entry) => {
				if (entry[1].schema.$ref) return;
				const seen = entry[1];
				const { ref, defId } = makeURI(entry);
				seen.def = { ...seen.schema };
				if (defId) seen.defId = defId;
				const schema = seen.schema;
				for (const key in schema) delete schema[key];
				schema.$ref = ref;
			};
			if (ctx.cycles === "throw") for (const entry of ctx.seen.entries()) {
				const seen = entry[1];
				if (seen.cycle) throw new Error(`Cycle detected: #/${seen.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
			}
			for (const entry of ctx.seen.entries()) {
				const seen = entry[1];
				if (schema === entry[0]) {
					extractToDef(entry);
					continue;
				}
				if (ctx.external) {
					const ext = ctx.external.registry.get(entry[0])?.id;
					if (schema !== entry[0] && ext) {
						extractToDef(entry);
						continue;
					}
				}
				if (ctx.metadataRegistry.get(entry[0])?.id) {
					extractToDef(entry);
					continue;
				}
				if (seen.cycle) {
					extractToDef(entry);
					continue;
				}
				if (seen.count > 1) {
					if (ctx.reused === "ref") {
						extractToDef(entry);
						continue;
					}
				}
			}
		}
		function finalize(ctx, schema) {
			const root = ctx.seen.get(schema);
			if (!root) throw new Error("Unprocessed schema. This is a bug in Zod.");
			const flattenRef = (zodSchema) => {
				const seen = ctx.seen.get(zodSchema);
				if (seen.ref === null) return;
				const schema = seen.def ?? seen.schema;
				const _cached = { ...schema };
				const ref = seen.ref;
				seen.ref = null;
				if (ref) {
					flattenRef(ref);
					const refSeen = ctx.seen.get(ref);
					const refSchema = refSeen.schema;
					if (refSchema.$ref && (ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0")) {
						schema.allOf = schema.allOf ?? [];
						schema.allOf.push(refSchema);
					} else Object.assign(schema, refSchema);
					Object.assign(schema, _cached);
					if (zodSchema._zod.parent === ref) for (const key in schema) {
						if (key === "$ref" || key === "allOf") continue;
						if (!(key in _cached)) delete schema[key];
					}
					if (refSchema.$ref && refSeen.def) for (const key in schema) {
						if (key === "$ref" || key === "allOf") continue;
						if (key in refSeen.def && JSON.stringify(schema[key]) === JSON.stringify(refSeen.def[key])) delete schema[key];
					}
				}
				const parent = zodSchema._zod.parent;
				if (parent && parent !== ref) {
					flattenRef(parent);
					const parentSeen = ctx.seen.get(parent);
					if (parentSeen?.schema.$ref) {
						schema.$ref = parentSeen.schema.$ref;
						if (parentSeen.def) for (const key in schema) {
							if (key === "$ref" || key === "allOf") continue;
							if (key in parentSeen.def && JSON.stringify(schema[key]) === JSON.stringify(parentSeen.def[key])) delete schema[key];
						}
					}
				}
				ctx.override({
					zodSchema,
					jsonSchema: schema,
					path: seen.path ?? []
				});
			};
			for (const entry of [...ctx.seen.entries()].reverse()) flattenRef(entry[0]);
			const result = {};
			if (ctx.target === "draft-2020-12") result.$schema = "https://json-schema.org/draft/2020-12/schema";
			else if (ctx.target === "draft-07") result.$schema = "http://json-schema.org/draft-07/schema#";
			else if (ctx.target === "draft-04") result.$schema = "http://json-schema.org/draft-04/schema#";
			else if (ctx.target === "openapi-3.0") {}
			if (ctx.external?.uri) {
				const id = ctx.external.registry.get(schema)?.id;
				if (!id) throw new Error("Schema is missing an `id` property");
				result.$id = ctx.external.uri(id);
			}
			Object.assign(result, root.def ?? root.schema);
			const rootMetaId = ctx.metadataRegistry.get(schema)?.id;
			if (rootMetaId !== void 0 && result.id === rootMetaId) delete result.id;
			const defs = ctx.external?.defs ?? {};
			for (const entry of ctx.seen.entries()) {
				const seen = entry[1];
				if (seen.def && seen.defId) {
					if (seen.def.id === seen.defId) delete seen.def.id;
					defs[seen.defId] = seen.def;
				}
			}
			if (ctx.external) {} else if (Object.keys(defs).length > 0) if (ctx.target === "draft-2020-12") result.$defs = defs;
			else result.definitions = defs;
			try {
				const finalized = JSON.parse(JSON.stringify(result));
				Object.defineProperty(finalized, "~standard", {
					value: {
						...schema["~standard"],
						jsonSchema: {
							input: createStandardJSONSchemaMethod(schema, "input", ctx.processors),
							output: createStandardJSONSchemaMethod(schema, "output", ctx.processors)
						}
					},
					enumerable: false,
					writable: false
				});
				return finalized;
			} catch (_err) {
				throw new Error("Error converting schema to JSON.");
			}
		}
		function isTransforming(_schema, _ctx) {
			const ctx = _ctx ?? { seen: /* @__PURE__ */ new Set() };
			if (ctx.seen.has(_schema)) return false;
			ctx.seen.add(_schema);
			const def = _schema._zod.def;
			if (def.type === "transform") return true;
			if (def.type === "array") return isTransforming(def.element, ctx);
			if (def.type === "set") return isTransforming(def.valueType, ctx);
			if (def.type === "lazy") return isTransforming(def.getter(), ctx);
			if (def.type === "promise" || def.type === "optional" || def.type === "nonoptional" || def.type === "nullable" || def.type === "readonly" || def.type === "default" || def.type === "prefault") return isTransforming(def.innerType, ctx);
			if (def.type === "intersection") return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
			if (def.type === "record" || def.type === "map") return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
			if (def.type === "pipe") {
				if (_schema._zod.traits.has("$ZodCodec")) return true;
				return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
			}
			if (def.type === "object") {
				for (const key in def.shape) if (isTransforming(def.shape[key], ctx)) return true;
				return false;
			}
			if (def.type === "union") {
				for (const option of def.options) if (isTransforming(option, ctx)) return true;
				return false;
			}
			if (def.type === "tuple") {
				for (const item of def.items) if (isTransforming(item, ctx)) return true;
				if (def.rest && isTransforming(def.rest, ctx)) return true;
				return false;
			}
			return false;
		}
		/**
		* Creates a toJSONSchema method for a schema instance.
		* This encapsulates the logic of initializing context, processing, extracting defs, and finalizing.
		*/
		const createToJSONSchemaMethod = (schema, processors = {}) => (params) => {
			const ctx = initializeContext({
				...params,
				processors
			});
			process(schema, ctx);
			extractDefs(ctx, schema);
			return finalize(ctx, schema);
		};
		const createStandardJSONSchemaMethod = (schema, io, processors = {}) => (params) => {
			const { libraryOptions, target } = params ?? {};
			const ctx = initializeContext({
				...libraryOptions ?? {},
				target,
				io,
				processors
			});
			process(schema, ctx);
			extractDefs(ctx, schema);
			return finalize(ctx, schema);
		};
		const formatMap = {
			guid: "uuid",
			url: "uri",
			datetime: "date-time",
			json_string: "json-string",
			regex: ""
		};
		const stringProcessor = (schema, ctx, _json, _params) => {
			const json = _json;
			json.type = "string";
			const { minimum, maximum, format, patterns, contentEncoding } = schema._zod.bag;
			if (typeof minimum === "number") json.minLength = minimum;
			if (typeof maximum === "number") json.maxLength = maximum;
			if (format) {
				json.format = formatMap[format] ?? format;
				if (json.format === "") delete json.format;
				if (format === "time") delete json.format;
			}
			if (contentEncoding) json.contentEncoding = contentEncoding;
			if (patterns && patterns.size > 0) {
				const regexes = [...patterns];
				if (regexes.length === 1) json.pattern = regexes[0].source;
				else if (regexes.length > 1) json.allOf = [...regexes.map((regex) => ({
					...ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0" ? { type: "string" } : {},
					pattern: regex.source
				}))];
			}
		};
		const numberProcessor = (schema, ctx, _json, _params) => {
			const json = _json;
			const { minimum, maximum, format, multipleOf, exclusiveMaximum, exclusiveMinimum } = schema._zod.bag;
			if (typeof format === "string" && format.includes("int")) json.type = "integer";
			else json.type = "number";
			const exMin = typeof exclusiveMinimum === "number" && exclusiveMinimum >= (minimum ?? Number.NEGATIVE_INFINITY);
			const exMax = typeof exclusiveMaximum === "number" && exclusiveMaximum <= (maximum ?? Number.POSITIVE_INFINITY);
			const legacy = ctx.target === "draft-04" || ctx.target === "openapi-3.0";
			if (exMin) if (legacy) {
				json.minimum = exclusiveMinimum;
				json.exclusiveMinimum = true;
			} else json.exclusiveMinimum = exclusiveMinimum;
			else if (typeof minimum === "number") json.minimum = minimum;
			if (exMax) if (legacy) {
				json.maximum = exclusiveMaximum;
				json.exclusiveMaximum = true;
			} else json.exclusiveMaximum = exclusiveMaximum;
			else if (typeof maximum === "number") json.maximum = maximum;
			if (typeof multipleOf === "number") json.multipleOf = multipleOf;
		};
		const booleanProcessor = (_schema, _ctx, json, _params) => {
			json.type = "boolean";
		};
		const neverProcessor = (_schema, _ctx, json, _params) => {
			json.not = {};
		};
		const enumProcessor = (schema, _ctx, json, _params) => {
			const def = schema._zod.def;
			const values = getEnumValues(def.entries);
			if (values.every((v) => typeof v === "number")) json.type = "number";
			if (values.every((v) => typeof v === "string")) json.type = "string";
			json.enum = values;
		};
		const literalProcessor = (schema, ctx, json, _params) => {
			const def = schema._zod.def;
			const vals = [];
			for (const val of def.values) if (val === void 0) {
				if (ctx.unrepresentable === "throw") throw new Error("Literal `undefined` cannot be represented in JSON Schema");
			} else if (typeof val === "bigint") if (ctx.unrepresentable === "throw") throw new Error("BigInt literals cannot be represented in JSON Schema");
			else vals.push(Number(val));
			else vals.push(val);
			if (vals.length === 0) {} else if (vals.length === 1) {
				const val = vals[0];
				json.type = val === null ? "null" : typeof val;
				if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") json.enum = [val];
				else json.const = val;
			} else {
				if (vals.every((v) => typeof v === "number")) json.type = "number";
				if (vals.every((v) => typeof v === "string")) json.type = "string";
				if (vals.every((v) => typeof v === "boolean")) json.type = "boolean";
				if (vals.every((v) => v === null)) json.type = "null";
				json.enum = vals;
			}
		};
		const customProcessor = (_schema, ctx, _json, _params) => {
			if (ctx.unrepresentable === "throw") throw new Error("Custom types cannot be represented in JSON Schema");
		};
		const transformProcessor = (_schema, ctx, _json, _params) => {
			if (ctx.unrepresentable === "throw") throw new Error("Transforms cannot be represented in JSON Schema");
		};
		const arrayProcessor = (schema, ctx, _json, params) => {
			const json = _json;
			const def = schema._zod.def;
			const { minimum, maximum } = schema._zod.bag;
			if (typeof minimum === "number") json.minItems = minimum;
			if (typeof maximum === "number") json.maxItems = maximum;
			json.type = "array";
			json.items = process(def.element, ctx, {
				...params,
				path: [...params.path, "items"]
			});
		};
		const objectProcessor = (schema, ctx, _json, params) => {
			const json = _json;
			const def = schema._zod.def;
			json.type = "object";
			json.properties = {};
			const shape = def.shape;
			for (const key in shape) json.properties[key] = process(shape[key], ctx, {
				...params,
				path: [
					...params.path,
					"properties",
					key
				]
			});
			const allKeys = new Set(Object.keys(shape));
			const requiredKeys = new Set([...allKeys].filter((key) => {
				const v = def.shape[key]._zod;
				if (ctx.io === "input") return v.optin === void 0;
				else return v.optout === void 0;
			}));
			if (requiredKeys.size > 0) json.required = Array.from(requiredKeys);
			if (def.catchall?._zod.def.type === "never") json.additionalProperties = false;
			else if (!def.catchall) {
				if (ctx.io === "output") json.additionalProperties = false;
			} else if (def.catchall) json.additionalProperties = process(def.catchall, ctx, {
				...params,
				path: [...params.path, "additionalProperties"]
			});
		};
		const unionProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			const isExclusive = def.inclusive === false;
			const options = def.options.map((x, i) => process(x, ctx, {
				...params,
				path: [
					...params.path,
					isExclusive ? "oneOf" : "anyOf",
					i
				]
			}));
			if (isExclusive) json.oneOf = options;
			else json.anyOf = options;
		};
		const intersectionProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			const a = process(def.left, ctx, {
				...params,
				path: [
					...params.path,
					"allOf",
					0
				]
			});
			const b = process(def.right, ctx, {
				...params,
				path: [
					...params.path,
					"allOf",
					1
				]
			});
			const isSimpleIntersection = (val) => "allOf" in val && Object.keys(val).length === 1;
			json.allOf = [...isSimpleIntersection(a) ? a.allOf : [a], ...isSimpleIntersection(b) ? b.allOf : [b]];
		};
		const nullableProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			const inner = process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			if (ctx.target === "openapi-3.0") {
				seen.ref = def.innerType;
				json.nullable = true;
			} else json.anyOf = [inner, { type: "null" }];
		};
		const nonoptionalProcessor = (schema, ctx, _json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
		};
		const defaultProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
			json.default = JSON.parse(JSON.stringify(def.defaultValue));
		};
		const prefaultProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
			if (ctx.io === "input") json._prefault = JSON.parse(JSON.stringify(def.defaultValue));
		};
		const catchProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
			let catchValue;
			try {
				catchValue = def.catchValue(void 0);
			} catch {
				throw new Error("Dynamic catch values are not supported in JSON Schema");
			}
			json.default = catchValue;
		};
		const pipeProcessor = (schema, ctx, _json, params) => {
			const def = schema._zod.def;
			const inIsTransform = def.in._zod.traits.has("$ZodTransform");
			const innerType = ctx.io === "input" ? inIsTransform ? def.out : def.in : def.out;
			process(innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = innerType;
		};
		const readonlyProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
			json.readOnly = true;
		};
		const optionalProcessor = (schema, ctx, _json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
		};
		const ZodISODateTime = /*@__PURE__*/ $constructor("ZodISODateTime", (inst, def) => {
			$ZodISODateTime.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		function datetime(params) {
			return /* @__PURE__ */ _isoDateTime(ZodISODateTime, params);
		}
		const ZodISODate = /*@__PURE__*/ $constructor("ZodISODate", (inst, def) => {
			$ZodISODate.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		function date(params) {
			return /* @__PURE__ */ _isoDate(ZodISODate, params);
		}
		const ZodISOTime = /*@__PURE__*/ $constructor("ZodISOTime", (inst, def) => {
			$ZodISOTime.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		function time(params) {
			return /* @__PURE__ */ _isoTime(ZodISOTime, params);
		}
		const ZodISODuration = /*@__PURE__*/ $constructor("ZodISODuration", (inst, def) => {
			$ZodISODuration.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		function duration(params) {
			return /* @__PURE__ */ _isoDuration(ZodISODuration, params);
		}
		const initializer = (inst, issues) => {
			$ZodError.init(inst, issues);
			inst.name = "ZodError";
			Object.defineProperties(inst, {
				format: { value: (mapper) => formatError(inst, mapper) },
				flatten: { value: (mapper) => flattenError(inst, mapper) },
				addIssue: { value: (issue) => {
					inst.issues.push(issue);
					inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
				} },
				addIssues: { value: (issues) => {
					inst.issues.push(...issues);
					inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
				} },
				isEmpty: { get() {
					return inst.issues.length === 0;
				} }
			});
		};
		const ZodRealError = /*@__PURE__*/ $constructor("ZodError", initializer, { Parent: Error });
		const parse = /* @__PURE__ */ _parse(ZodRealError);
		const parseAsync = /* @__PURE__ */ _parseAsync(ZodRealError);
		const safeParse = /* @__PURE__ */ _safeParse(ZodRealError);
		const safeParseAsync = /* @__PURE__ */ _safeParseAsync(ZodRealError);
		const encode = /* @__PURE__ */ _encode(ZodRealError);
		const decode = /* @__PURE__ */ _decode(ZodRealError);
		const encodeAsync = /* @__PURE__ */ _encodeAsync(ZodRealError);
		const decodeAsync = /* @__PURE__ */ _decodeAsync(ZodRealError);
		const safeEncode = /* @__PURE__ */ _safeEncode(ZodRealError);
		const safeDecode = /* @__PURE__ */ _safeDecode(ZodRealError);
		const safeEncodeAsync = /* @__PURE__ */ _safeEncodeAsync(ZodRealError);
		const safeDecodeAsync = /* @__PURE__ */ _safeDecodeAsync(ZodRealError);
		const _installedGroups = /* @__PURE__ */ new WeakMap();
		function _installLazyMethods(inst, group, methods) {
			const proto = Object.getPrototypeOf(inst);
			let installed = _installedGroups.get(proto);
			if (!installed) {
				installed = /* @__PURE__ */ new Set();
				_installedGroups.set(proto, installed);
			}
			if (installed.has(group)) return;
			installed.add(group);
			for (const key in methods) {
				const fn = methods[key];
				Object.defineProperty(proto, key, {
					configurable: true,
					enumerable: false,
					get() {
						const bound = fn.bind(this);
						Object.defineProperty(this, key, {
							configurable: true,
							writable: true,
							enumerable: true,
							value: bound
						});
						return bound;
					},
					set(v) {
						Object.defineProperty(this, key, {
							configurable: true,
							writable: true,
							enumerable: true,
							value: v
						});
					}
				});
			}
		}
		const ZodType = /*@__PURE__*/ $constructor("ZodType", (inst, def) => {
			$ZodType.init(inst, def);
			Object.assign(inst["~standard"], { jsonSchema: {
				input: createStandardJSONSchemaMethod(inst, "input"),
				output: createStandardJSONSchemaMethod(inst, "output")
			} });
			inst.toJSONSchema = createToJSONSchemaMethod(inst, {});
			inst.def = def;
			inst.type = def.type;
			Object.defineProperty(inst, "_def", { value: def });
			inst.parse = (data, params) => parse(inst, data, params, { callee: inst.parse });
			inst.safeParse = (data, params) => safeParse(inst, data, params);
			inst.parseAsync = async (data, params) => parseAsync(inst, data, params, { callee: inst.parseAsync });
			inst.safeParseAsync = async (data, params) => safeParseAsync(inst, data, params);
			inst.spa = inst.safeParseAsync;
			inst.encode = (data, params) => encode(inst, data, params);
			inst.decode = (data, params) => decode(inst, data, params);
			inst.encodeAsync = async (data, params) => encodeAsync(inst, data, params);
			inst.decodeAsync = async (data, params) => decodeAsync(inst, data, params);
			inst.safeEncode = (data, params) => safeEncode(inst, data, params);
			inst.safeDecode = (data, params) => safeDecode(inst, data, params);
			inst.safeEncodeAsync = async (data, params) => safeEncodeAsync(inst, data, params);
			inst.safeDecodeAsync = async (data, params) => safeDecodeAsync(inst, data, params);
			_installLazyMethods(inst, "ZodType", {
				check(...chks) {
					const def = this.def;
					return this.clone(mergeDefs(def, { checks: [...def.checks ?? [], ...chks.map((ch) => typeof ch === "function" ? { _zod: {
						check: ch,
						def: { check: "custom" },
						onattach: []
					} } : ch)] }), { parent: true });
				},
				with(...chks) {
					return this.check(...chks);
				},
				clone(def, params) {
					return clone(this, def, params);
				},
				brand() {
					return this;
				},
				register(reg, meta) {
					reg.add(this, meta);
					return this;
				},
				refine(check, params) {
					return this.check(refine(check, params));
				},
				superRefine(refinement, params) {
					return this.check(superRefine(refinement, params));
				},
				overwrite(fn) {
					return this.check(/* @__PURE__ */ _overwrite(fn));
				},
				optional() {
					return optional(this);
				},
				exactOptional() {
					return exactOptional(this);
				},
				nullable() {
					return nullable(this);
				},
				nullish() {
					return optional(nullable(this));
				},
				nonoptional(params) {
					return nonoptional(this, params);
				},
				array() {
					return array(this);
				},
				or(arg) {
					return union([this, arg]);
				},
				and(arg) {
					return intersection(this, arg);
				},
				transform(tx) {
					return pipe(this, transform(tx));
				},
				default(d) {
					return _default(this, d);
				},
				prefault(d) {
					return prefault(this, d);
				},
				catch(params) {
					return _catch(this, params);
				},
				pipe(target) {
					return pipe(this, target);
				},
				readonly() {
					return readonly(this);
				},
				describe(description) {
					const cl = this.clone();
					globalRegistry.add(cl, { description });
					return cl;
				},
				meta(...args) {
					if (args.length === 0) return globalRegistry.get(this);
					const cl = this.clone();
					globalRegistry.add(cl, args[0]);
					return cl;
				},
				isOptional() {
					return this.safeParse(void 0).success;
				},
				isNullable() {
					return this.safeParse(null).success;
				},
				apply(fn) {
					return fn(this);
				}
			});
			Object.defineProperty(inst, "description", {
				get() {
					return globalRegistry.get(inst)?.description;
				},
				configurable: true
			});
			return inst;
		});
		/** @internal */
		const _ZodString = /*@__PURE__*/ $constructor("_ZodString", (inst, def) => {
			$ZodString.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => stringProcessor(inst, ctx, json, params);
			const bag = inst._zod.bag;
			inst.format = bag.format ?? null;
			inst.minLength = bag.minimum ?? null;
			inst.maxLength = bag.maximum ?? null;
			_installLazyMethods(inst, "_ZodString", {
				regex(...args) {
					return this.check(/* @__PURE__ */ _regex(...args));
				},
				includes(...args) {
					return this.check(/* @__PURE__ */ _includes(...args));
				},
				startsWith(...args) {
					return this.check(/* @__PURE__ */ _startsWith(...args));
				},
				endsWith(...args) {
					return this.check(/* @__PURE__ */ _endsWith(...args));
				},
				min(...args) {
					return this.check(/* @__PURE__ */ _minLength(...args));
				},
				max(...args) {
					return this.check(/* @__PURE__ */ _maxLength(...args));
				},
				length(...args) {
					return this.check(/* @__PURE__ */ _length(...args));
				},
				nonempty(...args) {
					return this.check(/* @__PURE__ */ _minLength(1, ...args));
				},
				lowercase(params) {
					return this.check(/* @__PURE__ */ _lowercase(params));
				},
				uppercase(params) {
					return this.check(/* @__PURE__ */ _uppercase(params));
				},
				trim() {
					return this.check(/* @__PURE__ */ _trim());
				},
				normalize(...args) {
					return this.check(/* @__PURE__ */ _normalize(...args));
				},
				toLowerCase() {
					return this.check(/* @__PURE__ */ _toLowerCase());
				},
				toUpperCase() {
					return this.check(/* @__PURE__ */ _toUpperCase());
				},
				slugify() {
					return this.check(/* @__PURE__ */ _slugify());
				}
			});
		});
		const ZodString = /*@__PURE__*/ $constructor("ZodString", (inst, def) => {
			$ZodString.init(inst, def);
			_ZodString.init(inst, def);
			inst.email = (params) => inst.check(/* @__PURE__ */ _email(ZodEmail, params));
			inst.url = (params) => inst.check(/* @__PURE__ */ _url(ZodURL, params));
			inst.jwt = (params) => inst.check(/* @__PURE__ */ _jwt(ZodJWT, params));
			inst.emoji = (params) => inst.check(/* @__PURE__ */ _emoji(ZodEmoji, params));
			inst.guid = (params) => inst.check(/* @__PURE__ */ _guid(ZodGUID, params));
			inst.uuid = (params) => inst.check(/* @__PURE__ */ _uuid(ZodUUID, params));
			inst.uuidv4 = (params) => inst.check(/* @__PURE__ */ _uuidv4(ZodUUID, params));
			inst.uuidv6 = (params) => inst.check(/* @__PURE__ */ _uuidv6(ZodUUID, params));
			inst.uuidv7 = (params) => inst.check(/* @__PURE__ */ _uuidv7(ZodUUID, params));
			inst.nanoid = (params) => inst.check(/* @__PURE__ */ _nanoid(ZodNanoID, params));
			inst.guid = (params) => inst.check(/* @__PURE__ */ _guid(ZodGUID, params));
			inst.cuid = (params) => inst.check(/* @__PURE__ */ _cuid(ZodCUID, params));
			inst.cuid2 = (params) => inst.check(/* @__PURE__ */ _cuid2(ZodCUID2, params));
			inst.ulid = (params) => inst.check(/* @__PURE__ */ _ulid(ZodULID, params));
			inst.base64 = (params) => inst.check(/* @__PURE__ */ _base64(ZodBase64, params));
			inst.base64url = (params) => inst.check(/* @__PURE__ */ _base64url(ZodBase64URL, params));
			inst.xid = (params) => inst.check(/* @__PURE__ */ _xid(ZodXID, params));
			inst.ksuid = (params) => inst.check(/* @__PURE__ */ _ksuid(ZodKSUID, params));
			inst.ipv4 = (params) => inst.check(/* @__PURE__ */ _ipv4(ZodIPv4, params));
			inst.ipv6 = (params) => inst.check(/* @__PURE__ */ _ipv6(ZodIPv6, params));
			inst.cidrv4 = (params) => inst.check(/* @__PURE__ */ _cidrv4(ZodCIDRv4, params));
			inst.cidrv6 = (params) => inst.check(/* @__PURE__ */ _cidrv6(ZodCIDRv6, params));
			inst.e164 = (params) => inst.check(/* @__PURE__ */ _e164(ZodE164, params));
			inst.datetime = (params) => inst.check(datetime(params));
			inst.date = (params) => inst.check(date(params));
			inst.time = (params) => inst.check(time(params));
			inst.duration = (params) => inst.check(duration(params));
		});
		function string(params) {
			return /* @__PURE__ */ _string(ZodString, params);
		}
		const ZodStringFormat = /*@__PURE__*/ $constructor("ZodStringFormat", (inst, def) => {
			$ZodStringFormat.init(inst, def);
			_ZodString.init(inst, def);
		});
		const ZodEmail = /*@__PURE__*/ $constructor("ZodEmail", (inst, def) => {
			$ZodEmail.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodGUID = /*@__PURE__*/ $constructor("ZodGUID", (inst, def) => {
			$ZodGUID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodUUID = /*@__PURE__*/ $constructor("ZodUUID", (inst, def) => {
			$ZodUUID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodURL = /*@__PURE__*/ $constructor("ZodURL", (inst, def) => {
			$ZodURL.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodEmoji = /*@__PURE__*/ $constructor("ZodEmoji", (inst, def) => {
			$ZodEmoji.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodNanoID = /*@__PURE__*/ $constructor("ZodNanoID", (inst, def) => {
			$ZodNanoID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		/**
		* @deprecated CUID v1 is deprecated by its authors due to information leakage
		* (timestamps embedded in the id). Use {@link ZodCUID2} instead.
		* See https://github.com/paralleldrive/cuid.
		*/
		const ZodCUID = /*@__PURE__*/ $constructor("ZodCUID", (inst, def) => {
			$ZodCUID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodCUID2 = /*@__PURE__*/ $constructor("ZodCUID2", (inst, def) => {
			$ZodCUID2.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodULID = /*@__PURE__*/ $constructor("ZodULID", (inst, def) => {
			$ZodULID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodXID = /*@__PURE__*/ $constructor("ZodXID", (inst, def) => {
			$ZodXID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodKSUID = /*@__PURE__*/ $constructor("ZodKSUID", (inst, def) => {
			$ZodKSUID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodIPv4 = /*@__PURE__*/ $constructor("ZodIPv4", (inst, def) => {
			$ZodIPv4.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodIPv6 = /*@__PURE__*/ $constructor("ZodIPv6", (inst, def) => {
			$ZodIPv6.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodCIDRv4 = /*@__PURE__*/ $constructor("ZodCIDRv4", (inst, def) => {
			$ZodCIDRv4.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodCIDRv6 = /*@__PURE__*/ $constructor("ZodCIDRv6", (inst, def) => {
			$ZodCIDRv6.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodBase64 = /*@__PURE__*/ $constructor("ZodBase64", (inst, def) => {
			$ZodBase64.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodBase64URL = /*@__PURE__*/ $constructor("ZodBase64URL", (inst, def) => {
			$ZodBase64URL.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodE164 = /*@__PURE__*/ $constructor("ZodE164", (inst, def) => {
			$ZodE164.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodJWT = /*@__PURE__*/ $constructor("ZodJWT", (inst, def) => {
			$ZodJWT.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodNumber = /*@__PURE__*/ $constructor("ZodNumber", (inst, def) => {
			$ZodNumber.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => numberProcessor(inst, ctx, json, params);
			_installLazyMethods(inst, "ZodNumber", {
				gt(value, params) {
					return this.check(/* @__PURE__ */ _gt(value, params));
				},
				gte(value, params) {
					return this.check(/* @__PURE__ */ _gte(value, params));
				},
				min(value, params) {
					return this.check(/* @__PURE__ */ _gte(value, params));
				},
				lt(value, params) {
					return this.check(/* @__PURE__ */ _lt(value, params));
				},
				lte(value, params) {
					return this.check(/* @__PURE__ */ _lte(value, params));
				},
				max(value, params) {
					return this.check(/* @__PURE__ */ _lte(value, params));
				},
				int(params) {
					return this.check(int(params));
				},
				safe(params) {
					return this.check(int(params));
				},
				positive(params) {
					return this.check(/* @__PURE__ */ _gt(0, params));
				},
				nonnegative(params) {
					return this.check(/* @__PURE__ */ _gte(0, params));
				},
				negative(params) {
					return this.check(/* @__PURE__ */ _lt(0, params));
				},
				nonpositive(params) {
					return this.check(/* @__PURE__ */ _lte(0, params));
				},
				multipleOf(value, params) {
					return this.check(/* @__PURE__ */ _multipleOf(value, params));
				},
				step(value, params) {
					return this.check(/* @__PURE__ */ _multipleOf(value, params));
				},
				finite() {
					return this;
				}
			});
			const bag = inst._zod.bag;
			inst.minValue = Math.max(bag.minimum ?? Number.NEGATIVE_INFINITY, bag.exclusiveMinimum ?? Number.NEGATIVE_INFINITY) ?? null;
			inst.maxValue = Math.min(bag.maximum ?? Number.POSITIVE_INFINITY, bag.exclusiveMaximum ?? Number.POSITIVE_INFINITY) ?? null;
			inst.isInt = (bag.format ?? "").includes("int") || Number.isSafeInteger(bag.multipleOf ?? .5);
			inst.isFinite = true;
			inst.format = bag.format ?? null;
		});
		function number(params) {
			return /* @__PURE__ */ _number(ZodNumber, params);
		}
		const ZodNumberFormat = /*@__PURE__*/ $constructor("ZodNumberFormat", (inst, def) => {
			$ZodNumberFormat.init(inst, def);
			ZodNumber.init(inst, def);
		});
		function int(params) {
			return /* @__PURE__ */ _int(ZodNumberFormat, params);
		}
		const ZodBoolean = /*@__PURE__*/ $constructor("ZodBoolean", (inst, def) => {
			$ZodBoolean.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => booleanProcessor(inst, ctx, json, params);
		});
		function boolean(params) {
			return /* @__PURE__ */ _boolean(ZodBoolean, params);
		}
		const ZodUnknown = /*@__PURE__*/ $constructor("ZodUnknown", (inst, def) => {
			$ZodUnknown.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => void 0;
		});
		function unknown() {
			return /* @__PURE__ */ _unknown(ZodUnknown);
		}
		const ZodNever = /*@__PURE__*/ $constructor("ZodNever", (inst, def) => {
			$ZodNever.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => neverProcessor(inst, ctx, json, params);
		});
		function never(params) {
			return /* @__PURE__ */ _never(ZodNever, params);
		}
		const ZodArray = /*@__PURE__*/ $constructor("ZodArray", (inst, def) => {
			$ZodArray.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => arrayProcessor(inst, ctx, json, params);
			inst.element = def.element;
			_installLazyMethods(inst, "ZodArray", {
				min(n, params) {
					return this.check(/* @__PURE__ */ _minLength(n, params));
				},
				nonempty(params) {
					return this.check(/* @__PURE__ */ _minLength(1, params));
				},
				max(n, params) {
					return this.check(/* @__PURE__ */ _maxLength(n, params));
				},
				length(n, params) {
					return this.check(/* @__PURE__ */ _length(n, params));
				},
				unwrap() {
					return this.element;
				}
			});
		});
		function array(element, params) {
			return /* @__PURE__ */ _array(ZodArray, element, params);
		}
		const ZodObject = /*@__PURE__*/ $constructor("ZodObject", (inst, def) => {
			$ZodObjectJIT.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => objectProcessor(inst, ctx, json, params);
			defineLazy(inst, "shape", () => {
				return def.shape;
			});
			_installLazyMethods(inst, "ZodObject", {
				keyof() {
					return _enum(Object.keys(this._zod.def.shape));
				},
				catchall(catchall) {
					return this.clone({
						...this._zod.def,
						catchall
					});
				},
				passthrough() {
					return this.clone({
						...this._zod.def,
						catchall: unknown()
					});
				},
				loose() {
					return this.clone({
						...this._zod.def,
						catchall: unknown()
					});
				},
				strict() {
					return this.clone({
						...this._zod.def,
						catchall: never()
					});
				},
				strip() {
					return this.clone({
						...this._zod.def,
						catchall: void 0
					});
				},
				extend(incoming) {
					return extend(this, incoming);
				},
				safeExtend(incoming) {
					return safeExtend(this, incoming);
				},
				merge(other) {
					return merge(this, other);
				},
				pick(mask) {
					return pick(this, mask);
				},
				omit(mask) {
					return omit(this, mask);
				},
				partial(...args) {
					return partial(ZodOptional, this, args[0]);
				},
				required(...args) {
					return required(ZodNonOptional, this, args[0]);
				}
			});
		});
		function object(shape, params) {
			return new ZodObject({
				type: "object",
				shape: shape ?? {},
				...normalizeParams(params)
			});
		}
		const ZodUnion = /*@__PURE__*/ $constructor("ZodUnion", (inst, def) => {
			$ZodUnion.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => unionProcessor(inst, ctx, json, params);
			inst.options = def.options;
		});
		function union(options, params) {
			return new ZodUnion({
				type: "union",
				options,
				...normalizeParams(params)
			});
		}
		const ZodIntersection = /*@__PURE__*/ $constructor("ZodIntersection", (inst, def) => {
			$ZodIntersection.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => intersectionProcessor(inst, ctx, json, params);
		});
		function intersection(left, right) {
			return new ZodIntersection({
				type: "intersection",
				left,
				right
			});
		}
		const ZodEnum = /*@__PURE__*/ $constructor("ZodEnum", (inst, def) => {
			$ZodEnum.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => enumProcessor(inst, ctx, json, params);
			inst.enum = def.entries;
			inst.options = Object.values(def.entries);
			const keys = new Set(Object.keys(def.entries));
			inst.extract = (values, params) => {
				const newEntries = {};
				for (const value of values) if (keys.has(value)) newEntries[value] = def.entries[value];
				else throw new Error(`Key ${value} not found in enum`);
				return new ZodEnum({
					...def,
					checks: [],
					...normalizeParams(params),
					entries: newEntries
				});
			};
			inst.exclude = (values, params) => {
				const newEntries = { ...def.entries };
				for (const value of values) if (keys.has(value)) delete newEntries[value];
				else throw new Error(`Key ${value} not found in enum`);
				return new ZodEnum({
					...def,
					checks: [],
					...normalizeParams(params),
					entries: newEntries
				});
			};
		});
		function _enum(values, params) {
			return new ZodEnum({
				type: "enum",
				entries: Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values,
				...normalizeParams(params)
			});
		}
		const ZodLiteral = /*@__PURE__*/ $constructor("ZodLiteral", (inst, def) => {
			$ZodLiteral.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => literalProcessor(inst, ctx, json, params);
			inst.values = new Set(def.values);
			Object.defineProperty(inst, "value", { get() {
				if (def.values.length > 1) throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
				return def.values[0];
			} });
		});
		function literal(value, params) {
			return new ZodLiteral({
				type: "literal",
				values: Array.isArray(value) ? value : [value],
				...normalizeParams(params)
			});
		}
		const ZodTransform = /*@__PURE__*/ $constructor("ZodTransform", (inst, def) => {
			$ZodTransform.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => transformProcessor(inst, ctx, json, params);
			inst._zod.parse = (payload, _ctx) => {
				if (_ctx.direction === "backward") throw new $ZodEncodeError(inst.constructor.name);
				payload.addIssue = (issue$1) => {
					if (typeof issue$1 === "string") payload.issues.push(issue(issue$1, payload.value, def));
					else {
						const _issue = issue$1;
						if (_issue.fatal) _issue.continue = false;
						_issue.code ?? (_issue.code = "custom");
						_issue.input ?? (_issue.input = payload.value);
						_issue.inst ?? (_issue.inst = inst);
						payload.issues.push(issue(_issue));
					}
				};
				const output = def.transform(payload.value, payload);
				if (output instanceof Promise) return output.then((output) => {
					payload.value = output;
					payload.fallback = true;
					return payload;
				});
				payload.value = output;
				payload.fallback = true;
				return payload;
			};
		});
		function transform(fn) {
			return new ZodTransform({
				type: "transform",
				transform: fn
			});
		}
		const ZodOptional = /*@__PURE__*/ $constructor("ZodOptional", (inst, def) => {
			$ZodOptional.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function optional(innerType) {
			return new ZodOptional({
				type: "optional",
				innerType
			});
		}
		const ZodExactOptional = /*@__PURE__*/ $constructor("ZodExactOptional", (inst, def) => {
			$ZodExactOptional.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function exactOptional(innerType) {
			return new ZodExactOptional({
				type: "optional",
				innerType
			});
		}
		const ZodNullable = /*@__PURE__*/ $constructor("ZodNullable", (inst, def) => {
			$ZodNullable.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => nullableProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function nullable(innerType) {
			return new ZodNullable({
				type: "nullable",
				innerType
			});
		}
		const ZodDefault = /*@__PURE__*/ $constructor("ZodDefault", (inst, def) => {
			$ZodDefault.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => defaultProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
			inst.removeDefault = inst.unwrap;
		});
		function _default(innerType, defaultValue) {
			return new ZodDefault({
				type: "default",
				innerType,
				get defaultValue() {
					return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
				}
			});
		}
		const ZodPrefault = /*@__PURE__*/ $constructor("ZodPrefault", (inst, def) => {
			$ZodPrefault.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => prefaultProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function prefault(innerType, defaultValue) {
			return new ZodPrefault({
				type: "prefault",
				innerType,
				get defaultValue() {
					return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
				}
			});
		}
		const ZodNonOptional = /*@__PURE__*/ $constructor("ZodNonOptional", (inst, def) => {
			$ZodNonOptional.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => nonoptionalProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function nonoptional(innerType, params) {
			return new ZodNonOptional({
				type: "nonoptional",
				innerType,
				...normalizeParams(params)
			});
		}
		const ZodCatch = /*@__PURE__*/ $constructor("ZodCatch", (inst, def) => {
			$ZodCatch.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => catchProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
			inst.removeCatch = inst.unwrap;
		});
		function _catch(innerType, catchValue) {
			return new ZodCatch({
				type: "catch",
				innerType,
				catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
			});
		}
		const ZodPipe = /*@__PURE__*/ $constructor("ZodPipe", (inst, def) => {
			$ZodPipe.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => pipeProcessor(inst, ctx, json, params);
			inst.in = def.in;
			inst.out = def.out;
		});
		function pipe(in_, out) {
			return new ZodPipe({
				type: "pipe",
				in: in_,
				out
			});
		}
		const ZodReadonly = /*@__PURE__*/ $constructor("ZodReadonly", (inst, def) => {
			$ZodReadonly.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => readonlyProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function readonly(innerType) {
			return new ZodReadonly({
				type: "readonly",
				innerType
			});
		}
		const ZodCustom = /*@__PURE__*/ $constructor("ZodCustom", (inst, def) => {
			$ZodCustom.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => customProcessor(inst, ctx, json, params);
		});
		function refine(fn, _params = {}) {
			return /* @__PURE__ */ _refine(ZodCustom, fn, _params);
		}
		function superRefine(fn, params) {
			return /* @__PURE__ */ _superRefine(fn, params);
		}
		let dsh_agent_team_presets_teamPresets_catalog_result$schema$value;
		const dsh_agent_team_presets_teamPresets_catalog_result$schema = () => dsh_agent_team_presets_teamPresets_catalog_result$schema$value ??= object({ "tools": array(object({
			"name": string(),
			"description": string(),
			"captainOnly": boolean().optional(),
			"source": union([
				literal("presets"),
				literal("mcp"),
				literal("other")
			]),
			"server": string().optional()
		})) });
		let dsh_agent_team_presets_teamPresets_execution_result$schema$value;
		const dsh_agent_team_presets_teamPresets_execution_result$schema = () => dsh_agent_team_presets_teamPresets_execution_result$schema$value ??= object({ "teams": array(object({
			"teamId": string(),
			"state": union([
				literal("idle"),
				literal("busy"),
				literal("unknown")
			]),
			"busySessions": number(),
			"executingMembers": number(),
			"pendingSessions": number(),
			"notes": array(string())
		})) });
		const TYPERT_REMOTE = {
			package: "dsh-agent-team-presets",
			descriptors: [{
				id: "dsh-agent-team-presets#teamPresets/catalog",
				service: "teamPresetsToolCatalog",
				namespace: "teamPresets",
				method: "catalog",
				invocation: { kind: "direct" },
				parameters: [],
				result: {
					mode: "strict",
					typeSymbol: "dsh-agent-team-presets/types#ToolCatalogValue",
					create: dsh_agent_team_presets_teamPresets_catalog_result$schema
				},
				sourceLocation: {
					"file": "packages/local/team-presets/src/tool-catalog.ts",
					"line": 135,
					"column": 9
				}
			}, {
				id: "dsh-agent-team-presets#teamPresets/execution",
				service: "teamPresetsToolCatalog",
				namespace: "teamPresets",
				method: "execution",
				mode: "stream",
				invocation: { kind: "direct" },
				parameters: [],
				cancellation: { parameter: "signal" },
				result: {
					mode: "strict",
					typeSymbol: "dsh-agent-team-presets/types#TeamExecutionSnapshot",
					create: dsh_agent_team_presets_teamPresets_execution_result$schema
				},
				sourceLocation: {
					"file": "packages/local/team-presets/src/tool-catalog.ts",
					"line": 183,
					"column": 3
				}
			}]
		};


		/**
		* Pure Team preset helpers shared by the Host runtime and the browser page.
		* @module dsh-agent-team-presets/presets
		*/
		/**
		* Resolve a slot's explicit tool policy or its legacy list-only setting.
		* @param agent - the configured captain or member.
		* @returns the policy shown in Settings and enforced by the runtime.
		*/
		function toolMode(agent) {
			return agent.toolMode ?? (agent.tools.length === 0 ? "all" : "custom");
		}
		/** The member name grammar the Agent Teams service accepts. */
		const MEMBER_TARGET = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
		/**
		* Derive a teammate target from one member's display name.
		*
		* Teammate names are permanent, lower-kebab-case, and never reused, so a
		* display name that already satisfies the grammar is kept and any other name
		* is transliterated to `member-<index>`. The display name still reaches the
		* captain through the roster.
		* @param member - the configured member.
		* @param index - zero-based position in the Team's member list.
		* @param used - targets already taken in this Team; the returned target is added.
		* @returns the teammate target this member is summoned under.
		*/
		function memberTarget(member, index, used) {
			const candidate = member.name.trim().toLowerCase();
			const base = MEMBER_TARGET.test(candidate) && candidate !== "lead" && candidate.length <= 64 ? candidate : `member-${index + 1}`;
			let target = base;
			let suffix = 2;
			while (used.has(target)) {
				target = `${base}-${suffix}`;
				suffix += 1;
			}
			used.add(target);
			return target;
		}
		/**
		* List every addressable teammate target of one Team.
		* @param team - the Team preset.
		* @returns one entry per member, in declared order.
		*/
		function memberTargets(team) {
			const used = /* @__PURE__ */ new Set();
			return team.members.map((member, index) => ({
				member,
				target: memberTarget(member, index, used)
			}));
		}
		/**
		* Locate one Team preset by identity.
		* @param teams - every configured Team preset.
		* @param teamId - the identity to resolve.
		* @returns the matching Team, or undefined.
		*/
		function findTeam(teams, teamId) {
			return teamId === void 0 ? void 0 : teams.find((team) => team.id === teamId);
		}
		/**
		* Resolve the Team a Session selected.
		* @param teams - every configured Team preset.
		* @param selections - every Session selection record.
		* @param sessionId - the Session identity to resolve.
		* @returns the selected Team, or undefined when the Session selected none.
		*/
		function selectedTeam(teams, selections, sessionId) {
			return findTeam(teams, selections.find((record) => record.sessionId === sessionId)?.teamId);
		}
		/**
		* Replace the current Team selection of one Session.
		* @param selections - the current selection records.
		* @param sessionId - the Session whose selection changes.
		* @param teamId - the selected Team identity; undefined clears the selection.
		* @returns a new selection list, with the Session's record updated or removed.
		*/
		function withSelection(selections, sessionId, teamId) {
			const rest = selections.filter((record) => record.sessionId !== sessionId);
			return teamId === void 0 ? rest : [...rest, {
				sessionId,
				teamId
			}];
		}


		/** Locale bundles for the Agent Team presets page and composer control. */
		/** Locale namespace owned by this plugin. */
		const NS = "settings.agentTeamPresets";
		/** English copy. */
		const en = {
			nav: "Agent team presets",
			title: "Agent team presets",
			description: "Reusable Teams of named agents. Select a Team in the composer and its captain leads the session on the model you already picked, summoning members with their own prompt, model, reasoning effort, and tools.",
			newTeam: "New team",
			duplicate: "Duplicate",
			remove: "Delete team",
			removeMember: "Remove member",
			teamList: "Teams",
			emptyTeams: "No team configured yet. Create one, then select it in the composer.",
			emptySelection: "Select a team to edit it.",
			memberCount: "members",
			teamName: "Team name",
			teamNamePlaceholder: "Feature build team",
			teamDescription: "What this team is for",
			captain: "Captain",
			captainHint: "The captain replaces this session: its system prompt becomes the session prompt and its tool scope scopes the session tools. It leads on the model the session already selected, so a Team never changes your model.",
			members: "Members",
			addMember: "Add member",
			membersHint: "Members are templates. The captain summons one by name with spawn_team_member, and the member runs with the prompt, model, reasoning effort, and tools below.",
			agentName: "Name",
			agentNamePlaceholder: "reviewer",
			agentColor: "Color",
			agentDescription: "Description",
			route: "Model",
			routeInherit: "Follow the session",
			provider: "Provider",
			model: "Model",
			effort: "Reasoning effort",
			effortDefault: "Model default",
			captainModelHint: "The captain leads on the model this session already selected. Pick that model in the composer; a Team never changes it.",
			captainFollowsSession: "Session model",
			modelsPartial: "Some providers did not answer, so their models are missing from this list. Reopen this page to read them again.",
			modelsFailed: "The provider catalogue could not be read at all, so no model can be offered here. The route already stored for this agent is kept.",
			tools: "Allowed tools",
			toolMode: "Tool permissions",
			toolsDefault: "Default: all tools",
			toolsCustom: "Custom allowed tools",
			toolsHint: "Only checked configurable tools are allowed.",
			toolsAllHint: "Adds no tool restriction. Your custom selections are kept when you switch modes.",
			toolsEmpty: "No tools selected: all configurable tools are disabled.",
			toolsScoped: "Custom mode also controls agent-local Team tools: select the coordination tools this role needs. General code and ordinary delegation are disabled; preset-managed creation stays available only when selected.",
			toolsNoCatalog: "This deployment exposes no configurable tools.",
			toolsCaptainOnly: "Captain only: a member selecting it is still refused by the Team service.",
			toolsGroupPresets: "This plugin (Agent Team presets)",
			toolsGroupMcp: "MCP server",
			toolsGroupOther: "Other (native Harness and third-party plugin tools)",
			toolsInvert: "Invert",
			toolsSelectAll: "Select all",
			toolsClear: "Clear",
			toolsRemove: "Remove",
			toolsUnavailable: "Unavailable saved tools — remove these before applying custom permissions.",
			toolsLoading: "Loading tools…",
			toolsFailed: "The tool list could not be read; only the tools already chosen are shown.",
			systemPrompt: "System prompt",
			systemPromptPlaceholder: "You are…",
			systemPromptHint: "Registered as a prompt section template: complete {{variable}} groups interpolate against registered prompt variables, and an unknown variable fails the request.",
			promptWarnBraces: "This text contains a {{…}} group. DSH interpolates it against registered prompt variables and fails the request on an unknown name.",
			back: "Back",
			backToList: "All teams",
			editCaptain: "Edit captain",
			editMember: "Edit member",
			teamSections: "What this team contains",
			agentSections: "How this agent runs",
			modelSection: "Model",
			promptSection: "System prompt",
			toolsSection: "Tools",
			identitySection: "Identity",
			emptyMembers: "No member yet. Add one, then tell the captain to summon it by name.",
			inheritSession: "Follow the session",
			deleteAgent: "Delete this agent",
			roleCaptain: "Captain",
			roleMember: "Member",
			save: "Save",
			saving: "Saving…",
			saveFailed: "The host did not accept these values; your edits are kept.",
			discard: "Discard",
			unsaved: "Unsaved changes",
			teamNameRequired: "A Team needs a name before it can be saved: {teams}.",
			externalUpdateOne: "Team {team} was updated outside this page; the saved version is shown now.",
			externalUpdateMany: "{count} teams were updated outside this page ({teams}); the saved versions are shown now.",
			externalUpdateOverriddenOne: "Your unsaved changes to {team} were replaced.",
			externalUpdateOverriddenMany: "Your unsaved changes to {count} of them were replaced ({teams}).",
			externalAddedOne: "Team {team} was added outside this page and joined your draft.",
			externalAddedMany: "{count} teams were added outside this page and joined your draft ({teams}).",
			externalRemovedOne: "Team {team} was deleted outside this page and removed from your draft.",
			externalRemovedMany: "{count} teams were deleted outside this page and removed from your draft ({teams}).",
			externalRemovedEditedOne: "Your unsaved changes to {team} were dropped with it.",
			externalRemovedEditedMany: "Your unsaved changes to {count} of them were dropped with them.",
			executionBusy: "This team is running a task right now. A change to its purpose, roles, prompts, roster, or tool policy takes effect before its next team task; a member's model route applies to the next member it summons, including in this task.",
			executionBusyShared: "The preset is shared by every session that selected it: an idle session adopts a definition change right away, and a session in a running team task adopts it before its next one.",
			executionIdle: "No session is running this team's task, so a save takes effect right away.",
			executionUnknown: "Whether this team is running a task cannot be confirmed right now. A definition change does not affect a task already in progress; a member's model route applies to the next member summoned.",
			executionPtcOverridden: "This session's Agent preset asks for PTC batch calling. This team's strict custom tool policy is applied with native tool calling, so its allowed tools are called directly and the general-purpose code transport stays denied.",
			readOnly: "This deployment stores settings read-only.",
			unavailable: "The Agent team presets plugin is not loaded, so it cannot be configured right now.",
			sectionLoading: "Reading the Team configuration from the Host…",
			formIssueSettingsUnavailable: "This page is not backed by a Host settings document, so Teams cannot be stored from here.",
			formIssueNamespaceMissing: "This deployment serves no \"agent-team-presets\" settings section, so no Team can be stored or selected.",
			formIssueSchemaRejected: "The Host serves the Team section, but this client refused the value it holds: the stored Teams are shown read-only and a save would be refused.",
			selectionUnavailable: "No Team selection could be written: the Team settings section is not available in this page.",
			selectionRefused: "The Host refused the Team selection write.",
			selectionFailed: "The Team selection write did not complete.",
			composerTitle: "Team",
			composerNone: "No team",
			composerHint: "Apply one Team preset to this session.",
			composerMissing: "Missing Team: {team}",
			composerMissingHint: "This is not No team. An unapplicable selection denies tools; a running task keeps its old policy until idle. Choose a valid Team or No team.",
			importPreset: "Import preset",
			exportPreset: "Export",
			importNote: "A shared document carries names, descriptions, system prompts, and colors. Model routes and tool permissions stay local.",
			restoreDefaults: "Restore defaults",
			restoreDefaultsHint: "Puts the three presets this plugin ships back to their shipped name, description, prompts, colors, and roster. The model routes and tool permissions you configured stay as they are, and teams you created yourself are not touched.",
			defaultsRestored: "Default presets restored in this draft. Save to apply them.",
			defaultsUnchanged: "The default presets already match what this plugin ships; nothing was staged.",
			importConfirm: "Import",
			cancel: "Cancel",
			close: "Close",
			importConflictTitle: "Resolve import conflicts",
			importTeamConflict: "A team already uses this name",
			importTeamReplace: "Replace that team",
			importTeamRename: "Add as a new team",
			importNewTeamName: "New team name",
			importCaptainConflict: "Its captain already uses this name",
			importCaptainReplace: "Replace that captain",
			importCaptainRename: "Rename the imported captain",
			importMemberConflict: "These members already exist in that team",
			importMemberReplace: "Replace that member",
			importMemberRename: "Add it renamed",
			importInvalidJson: "That file is not valid JSON.",
			importInvalidFormat: "That file is not a Team preset document.",
			importUnsupportedVersion: "That document was written by a newer version of this plugin.",
			importUnsupportedFields: "That document carries fields a shared preset cannot hold, such as a model route or a tool permission.",
			importDuplicateMembers: "That document names the same member twice.",
			importTooManyMembers: "That document declares too many members.",
			importTooLarge: "That file is too large to be a Team preset."
		};
		/** Simplified Chinese copy. */
		const zh = {
			nav: "智能体团队预设",
			title: "智能体团队预设",
			description: "可复用的命名智能体团队。在对话框选中一个团队后，队长以你当前已选的模型接管本会话，并按名字召唤队员；每个队员使用自己配置的提示词、模型、思考强度和工具。",
			newTeam: "新建团队",
			duplicate: "复制",
			remove: "删除团队",
			removeMember: "删除队员",
			teamList: "团队列表",
			emptyTeams: "还没有配置团队。先新建一个，再到对话框里选择使用。",
			emptySelection: "选择一个团队进行编辑。",
			memberCount: "名队员",
			teamName: "团队名称",
			teamNamePlaceholder: "功能开发团队",
			teamDescription: "团队用途说明",
			captain: "队长",
			captainHint: "队长会接管本会话：队长的系统提示词成为会话提示词、工具权限作用于会话工具。队长使用会话当前已选的模型，团队不会改动你的模型。",
			members: "队员",
			addMember: "添加队员",
			membersHint: "队员是角色模板。队长用 spawn_team_member 按名字召唤，队员以此处配置的提示词、模型、思考强度和工具运行。",
			agentName: "名称",
			agentNamePlaceholder: "reviewer",
			agentColor: "颜色标记",
			agentDescription: "描述",
			route: "模型",
			routeInherit: "跟随会话",
			provider: "提供商",
			model: "模型",
			effort: "思考强度",
			effortDefault: "模型默认",
			captainModelHint: "队长使用本会话当前已选的模型。请在对话框里选择该模型；团队不会改动它。",
			captainFollowsSession: "会话模型",
			modelsPartial: "部分提供商没有返回模型列表，下面可能缺少它们的模型。重新打开本页可再次读取。",
			modelsFailed: "完全无法读取提供商模型目录，因此这里无法提供模型选择。该智能体已保存的路由会保留。",
			tools: "可用工具",
			toolMode: "工具权限",
			toolsDefault: "默认所有工具",
			toolsCustom: "自定义可用工具",
			toolsHint: "仅允许使用勾选的可配置工具。",
			toolsAllHint: "不额外限制工具。切换模式不会清除已保存的自定义勾选。",
			toolsEmpty: "未勾选任何工具：禁用全部可配置工具。",
			toolsScoped: "自定义模式同样限制作用域内的团队工具；请勾选该角色需要的协作工具。禁用通用代码和普通委派，预设成员创建也须勾选。",
			toolsNoCatalog: "当前部署没有可配置工具。",
			toolsCaptainOnly: "仅队长可用：队员勾选后仍会被团队服务拒绝。",
			toolsGroupPresets: "本插件（Agent Team presets）",
			toolsGroupMcp: "MCP 服务器",
			toolsGroupOther: "其他（原生 Harness 与第三方插件工具）",
			toolsInvert: "反选",
			toolsSelectAll: "全选",
			toolsClear: "清空",
			toolsRemove: "移除",
			toolsUnavailable: "以下已保存的工具当前不可用，请先移除再应用自定义权限。",
			toolsLoading: "正在读取工具列表…",
			toolsFailed: "工具列表读取失败，下面只显示已经选中的工具。",
			systemPrompt: "系统提示词",
			systemPromptPlaceholder: "你负责……",
			systemPromptHint: "作为提示词段落模板注册：完整的 {{变量}} 会按已注册的提示词变量插值，未知变量会让请求失败。",
			promptWarnBraces: "这段文本包含 {{…}}。DSH 会按已注册的提示词变量插值，名字未知会让请求失败。",
			back: "返回",
			backToList: "全部团队",
			editCaptain: "编辑队长",
			editMember: "编辑队员",
			teamSections: "这个团队包含什么",
			agentSections: "这个智能体怎么运行",
			modelSection: "模型",
			promptSection: "系统提示词",
			toolsSection: "工具",
			identitySection: "基本信息",
			emptyMembers: "还没有队员。先添加一个，然后让队长按名字召唤它。",
			inheritSession: "跟随会话",
			deleteAgent: "删除该队员",
			roleCaptain: "队长",
			roleMember: "队员",
			save: "保存",
			saving: "保存中…",
			saveFailed: "宿主没有接受这些值，你的修改已保留。",
			discard: "放弃修改",
			unsaved: "有未保存的修改",
			teamNameRequired: "团队名称不能为空，无法保存：{teams}。",
			externalUpdateOne: "团队 {team} 已被外部更新，页面已显示最新保存的版本。",
			externalUpdateMany: "{count} 个团队已被外部更新（{teams}），页面已显示最新保存的版本。",
			externalUpdateOverriddenOne: "你在 {team} 的未保存修改已被覆盖。",
			externalUpdateOverriddenMany: "其中 {count} 个团队的未保存修改已被覆盖（{teams}）。",
			externalAddedOne: "外部新增了团队 {team}，已加入你的草稿。",
			externalAddedMany: "外部新增了 {count} 个团队（{teams}），已加入你的草稿。",
			externalRemovedOne: "团队 {team} 已被外部删除，已从你的草稿移除。",
			externalRemovedMany: "{count} 个团队已被外部删除（{teams}），已从你的草稿移除。",
			externalRemovedEditedOne: "你在 {team} 的未保存修改随之丢失。",
			externalRemovedEditedMany: "其中 {count} 个团队的未保存修改随之丢失。",
			executionBusy: "当前团队正在执行任务。对团队用途、角色、提示词、成员名单或工具权限的修改，将在下一次团队任务开始前生效；队员的模型路由则在下次召唤该队员时生效，进行中的任务同样适用。",
			executionBusyShared: "此预设由多个会话共享：空闲会话立即采用定义修改，执行中的会话在下一次任务前采用。",
			executionIdle: "当前没有会话在执行该团队任务，保存后立即生效。",
			executionUnknown: "无法确认该团队是否正在执行任务。定义修改不会改变进行中的任务；队员的模型路由在下次召唤时生效。",
			executionPtcOverridden: "本会话的 Agent 预设要求 PTC 批量调用。该团队的严格自定义工具权限改用原生工具调用，因此白名单内的工具直接调用，通用代码传输仍被拒绝。",
			readOnly: "本部署的设置为只读。",
			unavailable: "智能体团队插件当前未加载，暂时无法配置。",
			sectionLoading: "正在从宿主读取团队配置…",
			formIssueSettingsUnavailable: "当前页面没有连接宿主设置文档，因此无法在这里保存团队。",
			formIssueNamespaceMissing: "本部署没有提供「agent-team-presets」设置分区，团队无法保存或选择。",
			formIssueSchemaRejected: "宿主提供了团队分区，但客户端拒绝接受其中的存储值：下面只读显示已保存的团队，保存会被拒绝。",
			selectionUnavailable: "无法写入团队选择：当前页面没有可用的团队设置分区。",
			selectionRefused: "宿主拒绝了团队选择写入。",
			selectionFailed: "团队选择写入未完成。",
			composerTitle: "团队",
			composerNone: "不使用团队",
			composerHint: "为本会话启用一个团队预设。",
			composerMissing: "团队已失效：{team}",
			composerMissingHint: "这不是“不使用团队”。无法应用时权限保持拒绝；进行中的任务保留旧策略直到空闲。请改选有效团队或“不使用团队”。",
			importPreset: "导入预设",
			exportPreset: "导出",
			importNote: "共享文档只携带名称、描述、系统提示词和颜色；模型路由与工具权限保留在本地。",
			restoreDefaults: "恢复默认预设",
			restoreDefaultsHint: "把插件自带的三个预设恢复到出厂的名称、说明、提示词、颜色和成员名单；你为它们配置的模型路由与工具权限保持不变，你自己创建的团队完全不受影响。",
			defaultsRestored: "默认预设已恢复到草稿，保存后生效。",
			defaultsUnchanged: "默认预设与插件出厂状态一致，无需恢复。",
			importConfirm: "导入",
			cancel: "取消",
			close: "关闭",
			importConflictTitle: "处理导入冲突",
			importTeamConflict: "已有团队使用了这个名称",
			importTeamReplace: "替换该团队",
			importTeamRename: "重命名后新增",
			importNewTeamName: "新团队名称",
			importCaptainConflict: "该团队的队长已使用这个名称",
			importCaptainReplace: "替换该队长",
			importCaptainRename: "重命名导入的队长",
			importMemberConflict: "该团队已存在这些队员",
			importMemberReplace: "替换该队员",
			importMemberRename: "重命名后新增",
			importInvalidJson: "该文件不是合法的 JSON。",
			importInvalidFormat: "该文件不是团队预设文档。",
			importUnsupportedVersion: "该文档由更新版本的插件生成。",
			importUnsupportedFields: "该文档包含共享预设无法携带的字段，例如模型路由或工具权限。",
			importDuplicateMembers: "该文档中有两个队员使用了相同名称。",
			importTooManyMembers: "该文档声明的队员数量过多。",
			importTooLarge: "该文件过大，不像是团队预设。"
		};
		/**
		* Locale key for one Host disclosure about how the applied Team runs.
		*
		* A Host disclosure is a locale key, so the page renders it in the reader's own
		* language; an unrecognised one is shown verbatim rather than swallowed, because
		* a disclosure the page cannot translate is still a disclosure it must not hide.
		*/
		const DISCLOSURE_NOTICE_KEYS = { "presentation.ptcOverridden": "executionPtcOverridden" };
		/** Locale key of the execution hint one Team state shows. */
		const EXECUTION_NOTICE_KEYS = {
			busy: "executionBusy",
			idle: "executionIdle",
			unknown: "executionUnknown"
		};
		/** Locale key of the notice one default-preset restore shows. */
		const DEFAULTS_NOTICE_KEYS = {
			restored: "defaultsRestored",
			unchanged: "defaultsUnchanged"
		};
		/** Locale key for one refused import. */
		const IMPORT_FAILURE_KEYS = {
			"invalid-json": "importInvalidJson",
			"invalid-format": "importInvalidFormat",
			"unsupported-version": "importUnsupportedVersion",
			"unsupported-fields": "importUnsupportedFields",
			"duplicate-members": "importDuplicateMembers",
			"too-many-members": "importTooManyMembers",
			"too-large": "importTooLarge"
		};
		/**
		* Locale key naming why the stored Team section cannot be edited.
		*
		* The three conditions have three different owners: a page with no Host
		* document is the deployment's, a namespace no row serves is the deployment's,
		* and a section this client refused to decode is this plugin's to report. The
		* page names which one it is instead of showing one "unavailable" for all.
		*/
		const FORM_ISSUE_KEYS = {
			"settings-unavailable": "formIssueSettingsUnavailable",
			"namespace-missing": "formIssueNamespaceMissing",
			"schema-rejected": "formIssueSchemaRejected"
		};
		/**
		* Locale key for one failed Team selection write.
		*
		* The Host's own refusal text is appended verbatim when there is one: it is the
		* only part of the notice that names what to change, and translating it would
		* replace an actionable message with a summary.
		*/
		const SELECTION_FAILURE_KEYS = {
			unavailable: "selectionUnavailable",
			refused: "selectionRefused",
			failed: "selectionFailed"
		};
		/**
		* Read one selection failure as the notice both surfaces render.
		*
		* The Host's refusal text is the only part of the notice that names what to
		* change, so it is appended verbatim rather than paraphrased: a translated
		* summary of "Config field \"selections\" is not volatile" would hide exactly
		* the sentence the reader needs. A `t` seat of any locale namespace is accepted
		* structurally, so both the page and the composer control can pass their own.
		* @param failure - the selection failure this client recorded.
		* @param t - the bound translate seat of this plugin's namespace.
		* @returns the notice text, with the Host's own detail when there is one.
		*/
		function selectionFailureText(failure, t) {
			const text = t(SELECTION_FAILURE_KEYS[failure.kind]);
			return failure.detail === void 0 || failure.detail === "" ? text : `${text} (${failure.detail})`;
		}


		const key$1 = "dsh-agent-team-presets:client/ComposerTeamSelect.module.css";
		if (typeof document !== "undefined" && !document.querySelector("style[data-team-presets-style=\"dsh-agent-team-presets:client/ComposerTeamSelect.module.css\"]")) {
			const style = document.createElement("style");
			style.dataset.teamPresetsStyle = key$1;
			style.textContent = ".Q4LFCW_trigger{border-radius:var(--dsw-radius-sm);min-width:0;max-width:160px;height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;outline:none;align-items:center;gap:4px;padding:0 4px 0 8px;font-size:13px;font-weight:500;line-height:20px;display:inline-flex}.Q4LFCW_trigger:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.Q4LFCW_trigger:focus-visible{box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary))}.Q4LFCW_trigger:disabled{color:var(--dsw-alias-label-dimmed);cursor:default}.Q4LFCW_triggerIcon{flex:none;display:inline-flex}.Q4LFCW_triggerIcon svg{width:14px;height:14px}.Q4LFCW_triggerLabel{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}.Q4LFCW_accentDot{border-radius:50%;flex:none;width:8px;height:8px}.Q4LFCW_failure{text-overflow:ellipsis;white-space:nowrap;max-width:220px;color:var(--dsw-alias-state-warn-label);font-size:11px;line-height:17px;overflow:hidden}";
			document.head.appendChild(style);
		}
		var ComposerTeamSelect_module_css_default = {
			"accentDot": "Q4LFCW_accentDot",
			"failure": "Q4LFCW_failure",
			"triggerIcon": "Q4LFCW_triggerIcon",
			"trigger": "Q4LFCW_trigger",
			"triggerLabel": "Q4LFCW_triggerLabel"
		};


		/**
		* The composer's Team control: pick the Team preset that leads this Session.
		* It sits in the composer tool row after the permission control.
		*/
		/**
		* Render the composer's Team picker.
		* @param props - the Session identity, the page's locale reader, and the selection writer.
		* @returns the Team trigger, plus a notice when the last selection write failed.
		*/
		function ComposerTeamSelect(props) {
			const { t, sessionId } = props;
			const state = props.useTeamPresets((snapshot) => snapshot);
			const [open, setOpen] = (0, react.useState)(false);
			const selection = state.selections.find((row) => row.sessionId === String(sessionId));
			const active = selectedTeam(state.teams, state.selections, String(sessionId));
			const missing = selection !== void 0 && active === void 0;
			const missingLabel = t("composerMissing").replace("{team}", selection?.teamId ?? "");
			const failure = state.selectionFailure === void 0 ? void 0 : selectionFailureText(state.selectionFailure, t);
			const issue = state.formIssue === void 0 ? void 0 : t(FORM_ISSUE_KEYS[state.formIssue]);
			const writable = state.status === "ready" && state.writable;
			return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
				open,
				items: [
					{
						id: "",
						label: t("composerNone")
					},
					...missing ? [{
						id: selection.teamId,
						label: missingLabel,
						disabled: true
					}] : [],
					...state.teams.map((team) => ({
						id: team.id,
						label: team.name === "" ? team.id : team.name
					}))
				],
				selectedId: selection?.teamId ?? "",
				onSelect: (id) => {
					setOpen(false);
					props.selectTeam(String(sessionId), id === "" ? void 0 : id);
				},
				onClose: () => {
					setOpen(false);
				},
				side: "top",
				portal: true,
				compact: true,
				anchor: (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: ComposerTeamSelect_module_css_default.trigger,
					disabled: !writable,
					"aria-haspopup": "listbox",
					"aria-expanded": open,
					title: failure ?? issue ?? (missing ? `${missingLabel}. ${t("composerMissingHint")}` : t("composerHint")),
					onClick: () => {
						setOpen((value) => !value);
					},
					children: [
						active === void 0 || active.captain.color === "" ? null : (0, react_jsx_runtime.jsx)("span", {
							className: ComposerTeamSelect_module_css_default.accentDot,
							style: { background: active.captain.color },
							"aria-hidden": true
						}),
						(0, react_jsx_runtime.jsx)("span", {
							className: ComposerTeamSelect_module_css_default.triggerLabel,
							"aria-label": t("composerTitle"),
							children: missing ? missingLabel : active === void 0 ? t("composerTitle") : active.name === "" ? active.id : active.name
						}),
						(0, react_jsx_runtime.jsx)("span", {
							className: ComposerTeamSelect_module_css_default.triggerIcon,
							children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutlineRegular, { size: 14 })
						})
					]
				})
			}), failure === void 0 ? null : (0, react_jsx_runtime.jsx)("span", {
				className: ComposerTeamSelect_module_css_default.failure,
				role: "status",
				children: failure
			})] });
		}


		/**
		* Accent colors this plugin publishes to the Agent Teams roster.
		*
		* A Team's configured colors live in the settings document rather than in the
		* Session log, so the browser half resolves them from the same stored Teams and
		* selections the Settings page and the composer control edit.
		*
		* The roster's appearance registry is a deployment extension rather than part of
		* official rc.2, so its shape is declared here instead of imported from a
		* package the plugin cannot depend on. A structurally identical local
		* declaration keeps this plugin compiling against the official release while a
		* deployment that ships the extension still accepts these values.
		* @module dsh-agent-team-presets/appearance
		*/
		/**
		* Resolve the accent colors of the Team one Session selected.
		* @param teams - every stored Team preset.
		* @param selections - every Session's stored Team selection.
		* @param sessionId - the Lead Session identity.
		* @returns the colors the roster draws with, or undefined when the Session selected no Team.
		*/
		function teamAppearance(teams, selections, sessionId) {
			const teamId = selections.find((record) => record.sessionId === sessionId)?.teamId;
			const team = teams.find((candidate) => candidate.id === teamId);
			if (team === void 0) return void 0;
			return {
				captain: team.captain.color,
				members: new Map(memberTargets(team).map(({ member, target }) => [target, member.color]))
			};
		}


		/**
		* Fixed JSON transfer format for one Team preset.
		*
		* A shared document carries the parts of a Team that keep working after the
		* document moves to another deployment: the Team's own name and purpose, and
		* each agent's name, description, standing system prompt, and accent color.
		* Model routes and tool permissions stay local, because a route names a
		* provider this deployment may not run and an allow-list names tools it may not
		* expose. A document that carries them is refused rather than silently reduced,
		* so a reader never believes it imported something it did not.
		*
		* The format is deliberately not the stored record: the Host document keeps
		* `toolMode`, `tools`, `provider`, `model`, and `reasoningEffort` beside the
		* shared fields, and an import writes only the fields a document carries.
		* @module dsh-agent-team-presets/preset-transfer
		*/
		/** Format marker every shareable Team document carries. */
		const TEAM_PRESET_FORMAT = "dsh-agent-team-preset";
		/** Keys a document root may carry. */
		const ROOT_KEYS = [
			"format",
			"version",
			"team"
		];
		/** Keys a shared Team may carry. */
		const TEAM_KEYS = [
			"name",
			"description",
			"captain",
			"members"
		];
		/** Keys a shared slot may carry. */
		const SLOT_KEYS = [
			"name",
			"description",
			"systemPrompt",
			"color"
		];
		/** Internal refusal carrying the reason the document was rejected. */
		var Refused = class extends Error {
			reason;
			/**
			* @param reason - why the document is not a Team preset of this format.
			*/
			constructor(reason) {
				super(reason);
				this.reason = reason;
				this.name = "Refused";
			}
		};
		/**
		* Whether one parsed value is a plain JSON object.
		* @param value - candidate value.
		* @returns whether the value is a non-null, non-array object.
		*/
		function isRecord(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value);
		}
		/**
		* Whether one record carries a key outside the allowed set.
		* @param value - record to inspect.
		* @param allowed - keys this format declares.
		* @returns whether at least one key is not part of the format.
		*/
		function hasUnknownKey(value, allowed) {
			return Object.keys(value).some((key) => !allowed.includes(key));
		}
		/**
		* Read one required string field.
		* @param value - record to read.
		* @param key - field name.
		* @returns the field's text, or undefined when it is absent or not a string.
		*/
		function readText(value, key) {
			const field = value[key];
			return typeof field === "string" ? field : void 0;
		}
		/**
		* Read one shared slot.
		* @param value - candidate slot.
		* @returns the slot's shareable fields.
		* @throws {Refused} when the value is not a slot of this format.
		*/
		function readSlot(value) {
			if (!isRecord(value)) throw new Refused("invalid-format");
			if (hasUnknownKey(value, SLOT_KEYS)) throw new Refused("unsupported-fields");
			const name = readText(value, "name");
			const description = readText(value, "description");
			const systemPrompt = readText(value, "systemPrompt");
			const color = readText(value, "color");
			if (name === void 0 || description === void 0 || systemPrompt === void 0 || color === void 0) throw new Refused("invalid-format");
			return {
				name,
				description,
				systemPrompt,
				color
			};
		}
		/**
		* Read the members of one shared Team, refusing a repeated name.
		*
		* Two members under one name would derive the same teammate target, so the
		* document is refused instead of importing a Team whose second member can never
		* be summoned by name.
		* @param value - candidate member list.
		* @returns the members, in declared order.
		* @throws {Refused} when the list is malformed or repeats a name.
		*/
		function readMembers(value) {
			if (!Array.isArray(value)) throw new Refused("invalid-format");
			if (value.length > 64) throw new Refused("too-many-members");
			const members = value.map((member) => readSlot(member));
			const seen = /* @__PURE__ */ new Set();
			for (const member of members) {
				const key = slotNameKey(member.name);
				if (key === "") continue;
				if (seen.has(key)) throw new Refused("duplicate-members");
				seen.add(key);
			}
			return members;
		}
		/**
		* Read one shared Team.
		* @param value - candidate Team.
		* @returns the Team's shareable content.
		* @throws {Refused} when the value is not a Team of this format.
		*/
		function readTeam(value) {
			if (!isRecord(value)) throw new Refused("invalid-format");
			if (hasUnknownKey(value, TEAM_KEYS)) throw new Refused("unsupported-fields");
			const name = readText(value, "name");
			const description = readText(value, "description");
			if (name === void 0 || description === void 0) throw new Refused("invalid-format");
			return {
				name,
				description,
				captain: readSlot(value["captain"]),
				members: readMembers(value["members"])
			};
		}
		/**
		* Read one parsed document.
		* @param value - candidate document.
		* @returns the document, or the reason it is not a Team preset of this format.
		* @throws when a failure other than a refusal escapes the reader.
		*/
		function readTransfer(value) {
			if (!isRecord(value)) throw new Refused("invalid-format");
			if (hasUnknownKey(value, ROOT_KEYS)) throw new Refused("unsupported-fields");
			if (value["format"] !== "dsh-agent-team-preset") throw new Refused("invalid-format");
			const version = value["version"];
			if (typeof version !== "number" || !Number.isInteger(version)) throw new Refused("invalid-format");
			if (version !== 1) throw new Refused("unsupported-version");
			return {
				format: TEAM_PRESET_FORMAT,
				version: 1,
				team: readTeam(value["team"])
			};
		}
		/**
		* Read one already-parsed document.
		* @param value - candidate document.
		* @returns the document, or the reason it is not a Team preset of this format.
		*/
		function parseTeamPresetValue(value) {
			try {
				return {
					ok: true,
					transfer: readTransfer(value)
				};
			} catch (error) {
				if (error instanceof Refused) return {
					ok: false,
					reason: error.reason
				};
				throw error;
			}
		}
		/**
		* Read one shared document from its JSON text.
		* @param text - the document text.
		* @returns the document, or the reason it is not a Team preset of this format.
		*/
		function parseTeamPresetText(text) {
			if (text.length > 524288) return {
				ok: false,
				reason: "too-large"
			};
			let value;
			try {
				value = JSON.parse(text);
			} catch {
				return {
					ok: false,
					reason: "invalid-json"
				};
			}
			return parseTeamPresetValue(value);
		}
		/**
		* Compare two slot names the way the runtime matches a summoned member.
		*
		* `findMember` accepts a member's derived target or its display name, and the
		* target is the lower-kebab-case form of the name, so two names that differ
		* only by case or surrounding space address the same teammate.
		* @param name - one configured or shared name.
		* @returns the comparison key of that name.
		*/
		function slotNameKey(name) {
			return name.trim().toLowerCase();
		}
		/**
		* Derive a name that is not already taken.
		* @param base - the preferred name.
		* @param taken - names already used in the same scope.
		* @returns the preferred name, or that name with the first free numeric suffix.
		*/
		function uniqueName(base, taken) {
			const preferred = base.trim();
			const used = new Set([...taken].map((name) => name.trim()));
			if (preferred === "" || !used.has(preferred)) return preferred;
			let suffix = 2;
			while (used.has(`${preferred} ${String(suffix)}`)) suffix += 1;
			return `${preferred} ${String(suffix)}`;
		}
		/**
		* Project one slot onto the fields a shared document carries.
		* @param slot - the configured captain or member.
		* @returns the slot's shareable fields.
		*/
		function shareSlot(slot) {
			return {
				name: slot.name,
				description: slot.description,
				systemPrompt: slot.systemPrompt,
				color: slot.color
			};
		}
		/**
		* Project one Team onto the document that shares it.
		* @param team - the Team preset to share.
		* @returns the shareable document.
		*/
		function exportTeamPreset(team) {
			return {
				format: TEAM_PRESET_FORMAT,
				version: 1,
				team: {
					name: team.name,
					description: team.description,
					captain: shareSlot(team.captain),
					members: team.members.map((member) => shareSlot(member))
				}
			};
		}
		/**
		* Serialize one Team as the fixed document this plugin imports.
		* @param team - the Team preset to share.
		* @returns the document text, newline-terminated.
		*/
		function serializeTeamPreset(team) {
			return `${JSON.stringify(exportTeamPreset(team), null, 2)}\n`;
		}
		/**
		* Build one captain from a shared slot.
		* @param slot - the shared captain.
		* @returns a captain carrying the shared fields and the local defaults.
		*/
		function captainFromTransfer(slot) {
			return {
				name: slot.name,
				color: slot.color,
				description: slot.description,
				toolMode: "all",
				tools: [],
				systemPrompt: slot.systemPrompt
			};
		}
		/**
		* Build one member from a shared slot.
		* @param slot - the shared member.
		* @returns a member carrying the shared fields, no route, and the default tool policy.
		*/
		function memberFromTransfer(slot) {
			return {
				...captainFromTransfer(slot),
				id: crypto.randomUUID(),
				provider: "",
				model: "",
				reasoningEffort: ""
			};
		}
		/**
		* Overwrite the fields one shared slot carries, keeping every local field.
		*
		* This is what makes a replacement non-destructive: the imported name,
		* description, prompt, and color land, while the route and tool policy the
		* deployment already configured stay exactly as they were.
		* @param slot - the configured captain or member being overwritten.
		* @param shared - the document's version of that slot.
		* @returns a slot carrying the shared fields and the original local ones.
		*/
		function applySharedFields(slot, shared) {
			return {
				...slot,
				name: shared.name,
				description: shared.description,
				systemPrompt: shared.systemPrompt,
				color: shared.color
			};
		}
		/**
		* Build one local Team from a shared document.
		*
		* Everything the document does not carry starts empty: routes follow the
		* Session and the tool policy stays unrestricted, so an imported Team never
		* inherits a route or an allow-list from the document it came from.
		* @param transfer - the document to import.
		* @param id - the local identity the imported Team takes.
		* @returns a new Team preset carrying the document's shareable content.
		*/
		function teamFromTransfer(transfer, id) {
			return {
				id,
				name: transfer.team.name,
				description: transfer.team.description,
				captain: captainFromTransfer(transfer.team.captain),
				members: transfer.team.members.map((member) => memberFromTransfer(member))
			};
		}
		/**
		* Find what one document collides with in the configured Teams.
		*
		* Every key is compared inside the Team the document would overwrite: a Team by
		* its name, and its captain and members by theirs. A name only reaches this
		* check when the two Teams are the same one, because replacing a captain or a
		* member of some *other* Team is not an edit the import may make. An unnamed
		* slot never collides: it is addressed by position, not by name.
		* @param teams - every Team the page currently shows.
		* @param transfer - the document being imported.
		* @returns the colliding Team, its conflicting agent names, and free replacement names.
		*/
		function importConflicts(teams, transfer) {
			const key = slotNameKey(transfer.team.name);
			const targetIndex = key === "" ? -1 : teams.findIndex((team) => slotNameKey(team.name) === key);
			const target = targetIndex < 0 ? void 0 : teams[targetIndex];
			const captainKey = slotNameKey(transfer.team.captain.name);
			const captainConflict = target !== void 0 && captainKey !== "" && slotNameKey(target.captain.name) === captainKey ? transfer.team.captain.name : "";
			const used = target === void 0 ? void 0 : new Set(target.members.map((member) => slotNameKey(member.name)).filter((memberKey) => memberKey !== ""));
			const memberConflicts = used === void 0 ? [] : transfer.team.members.filter((member) => used.has(slotNameKey(member.name))).map((member) => member.name);
			return {
				targetIndex: target === void 0 ? void 0 : targetIndex,
				targetName: target?.name.trim() ?? "",
				captainConflict,
				memberConflicts,
				suggestedTeamName: uniqueName(transfer.team.name, teams.map((team) => team.name)),
				suggestedCaptainName: uniqueName(transfer.team.captain.name, target === void 0 ? [] : [target.captain.name])
			};
		}
		/** Every shipped preset, lightest first, in the order a fresh deployment lists them. */
		const BUILTIN_TEAMS = [
			{
				id: "builtin-lightweight",
				document: {
					format: TEAM_PRESET_FORMAT,
					version: 1,
					team: {
						name: "轻量研发团队",
						description: "适合小型功能与模块迭代。队长划分任务，架构顾问按需处理技术决策，研发执行者承担编码、调试、测试与修复。",
						captain: {
							name: "team-lead",
							description: "确定目标、任务写入边界和验收证据，按需调度与最终风险裁决。",
							systemPrompt: "你是工程团队队长，负责范围、调度、依赖、风险和最终验收。具体实现交执行者，专业决策咨询对应顾问。\n1. 仅在用户明确要求团队协作时召集成员；先确认目标平台、项目规则、权限与实际可用工具、验收标准。不得假定服务、浏览器或设备可用，不索取明文秘密。\n2. 任务板按切片记录交付物、验收、依赖、负责人及文件写入范围；仅并行互不冲突的工作。接口契约未确定不得盲目实现；已有任务不重复派发，以消息和状态事件推进，避免空转查询。\n3. 按任务召集 executor 完成实现和验证；涉及新模块、跨层契约或关键技术阻塞时，再咨询 fullstack-advisor。顾问不参与常规调试循环，队长依据测试证据验收。\n4. 交接优先使用变更路径、简要差异、测试命令和结果、证据位置、待决风险；详情按需读取，不要求复制完整日志。共享浏览器实行单操作者交接；视觉结论需实际查看落盘截图，缺少证据则标记未验证。\n5. 高风险问题修复后复验；同一问题两轮未解决须重新分析根因。必要验收缺证据不得放行；仍有运行中成员或未闭环任务时不得宣布完成。\n6. 最终汇总交付内容、验证结果、未验证项及风险。Git 暂存与提交遵守项目规则和用户授权；push、发布、改写历史分别取得授权。成员默认不继续委派，例外需明确授权并确认工具支持及隔离范围。",
							color: "#4c8dff"
						},
						members: [{
							name: "fullstack-advisor",
							description: "按需提供跨层技术方案与可执行验收契约，不负责具体编码。",
							systemPrompt: "你是全栈架构顾问，负责技术方案与实施契约，不修改生产代码、测试或生成脚本。\n1. 围绕具体问题查阅项目规则、相关实现与必要文档，沿用既有技术栈，不扩大重构范围。\n2. 按需确定模块边界、数据流、接口字段与错误语义，并提示涉及的权限、安全、迁移兼容及性能风险；列出假设和待决事项。\n3. 输出给执行者的简洁契约：关键决定、关联文件或接口、验收条件、阻塞及风险。仅在关键技术取舍、方案变更或明确阻塞时重新介入。\n4. 只写获指派的契约文档；静态分析不能冒充运行验证。默认不继续委派，也不接管常规编码、调试和测试。",
							color: "#e0a43c"
						}, {
							name: "executor",
							description: "负责具体编码、调试、测试、修复与验证交接。",
							systemPrompt: "你是研发执行者，负责获派范围的编码、调试、测试、修复和必要生成脚本。\n1. 先核对任务、项目规则、相关实现、接口契约、文件归属与验收要求；业务歧义交队长澄清，不自行补造规则。\n2. 按最小可验证切片实施，覆盖必要校验、错误处理和回归测试；遵循现有技术栈，不改无关文件或覆盖他人产物。默认不继续委派。\n3. 运行适用的 lint、测试、构建和必要的真实链路，记录命令、结果、失败原因与验证范围；mock 通过不能替代关键真实路径。重要修复补负例，测试失败不得报通过。\n4. 每个检查点交接变更路径、简要差异、测试证据、风险与待决事项；长日志只传位置。按审查意见定点修复，同一问题两轮失败则报告根因并交队长协调。\n5. 生成物按项目流程产生，不手改；提交前核对暂存范围并遵守授权，push 与发布另需授权。浏览器或设备操作先确认能力及交接；视觉相关任务保留页面、视口、状态和落盘截图，未实际验证不宣称通过。",
							color: "#4c8dff"
						}]
					}
				}
			},
			{
				id: "builtin-standard",
				document: {
					format: TEAM_PRESET_FORMAT,
					version: 1,
					team: {
						name: "标准研发团队",
						description: "适合中型功能、重要重构与持续项目迭代。队长统筹、架构顾问按需咨询、执行者持续研发，独立审查员检查变更与验证证据。",
						captain: {
							name: "team-lead",
							description: "确定目标、任务写入边界和验收证据，按需调度与最终风险裁决。",
							systemPrompt: "你是工程团队队长，负责范围、调度、依赖、风险和最终验收。具体实现交执行者，专业决策咨询对应顾问。\n1. 仅在用户明确要求团队协作时召集成员；先确认目标平台、项目规则、权限与实际可用工具、验收标准。不得假定服务、浏览器或设备可用，不索取明文秘密。\n2. 任务板按切片记录交付物、验收、依赖、负责人及文件写入范围；仅并行互不冲突的工作。接口契约未确定不得盲目实现；已有任务不重复派发，以消息和状态事件推进，避免空转查询。\n3. executor 承担实现与测试；关键设计问题咨询 fullstack-advisor；reviewer 对有代码变更的交付开展独立审查，高风险切片提前介入，修复后聚焦复审，避免重复全量审查。\n4. 交接优先使用变更路径、简要差异、测试命令和结果、证据位置、待决风险；详情按需读取，不要求复制完整日志。共享浏览器实行单操作者交接；视觉结论需实际查看落盘截图，缺少证据则标记未验证。\n5. 高风险问题修复后复验；同一问题两轮未解决须重新分析根因。必要验收缺证据不得放行；仍有运行中成员或未闭环任务时不得宣布完成。\n6. 最终汇总交付内容、验证结果、未验证项及风险。Git 暂存与提交遵守项目规则和用户授权；push、发布、改写历史分别取得授权。成员默认不继续委派，例外需明确授权并确认工具支持及隔离范围。",
							color: "#4c8dff"
						},
						members: [
							{
								name: "fullstack-advisor",
								description: "按需提供跨层技术方案与可执行验收契约，不负责具体编码。",
								systemPrompt: "你是全栈架构顾问，负责技术方案与实施契约，不修改生产代码、测试或生成脚本。\n1. 围绕具体问题查阅项目规则、相关实现与必要文档，沿用既有技术栈，不扩大重构范围。\n2. 按需确定模块边界、数据流、接口字段与错误语义，并提示涉及的权限、安全、迁移兼容及性能风险；列出假设和待决事项。\n3. 输出给执行者的简洁契约：关键决定、关联文件或接口、验收条件、阻塞及风险。仅在关键技术取舍、方案变更或明确阻塞时重新介入。\n4. 只写获指派的契约文档；静态分析不能冒充运行验证。默认不继续委派，也不接管常规编码、调试和测试。",
								color: "#e0a43c"
							},
							{
								name: "reviewer",
								description: "独立审查实际变更、关键风险与测试有效性。",
								systemPrompt: "你是独立代码审查员，不修改共享生产实现，不以成员自评取代证据。\n1. 围绕实际变更、关键调用链与约定的验收契约审查功能、安全权限、并发、兼容迁移和重要界面状态；不无目的扫描全仓。\n2. 确认测试到达目标路径、关键断言能捕获缺陷；mock、全绿和静态检查均不自动等于真实验证。独立复跑前确认权限与隔离范围，不污染共享文件。\n3. 将发现区分为已证实缺陷、待验证风险与建议；按 P0/P1/P2/P3 报告位置、触发条件、影响、证据和最小修复建议。复审聚焦修复差异与相关回归。\n4. 视觉判断需亲自读取实际截图；设计争议交队长协调。结论为通过、需修改或证据不足；必要项未验证不得放行，风险接受交队长裁决。默认不继续委派。",
								color: "#8d6bff"
							},
							{
								name: "executor",
								description: "负责具体编码、调试、测试、修复与验证交接。",
								systemPrompt: "你是研发执行者，负责获派范围的编码、调试、测试、修复和必要生成脚本。\n1. 先核对任务、项目规则、相关实现、接口契约、文件归属与验收要求；业务歧义交队长澄清，不自行补造规则。\n2. 按最小可验证切片实施，覆盖必要校验、错误处理和回归测试；遵循现有技术栈，不改无关文件或覆盖他人产物。默认不继续委派。\n3. 运行适用的 lint、测试、构建和必要的真实链路，记录命令、结果、失败原因与验证范围；mock 通过不能替代关键真实路径。重要修复补负例，测试失败不得报通过。\n4. 每个检查点交接变更路径、简要差异、测试证据、风险与待决事项；长日志只传位置。按审查意见定点修复，同一问题两轮失败则报告根因并交队长协调。\n5. 生成物按项目流程产生，不手改；提交前核对暂存范围并遵守授权，push 与发布另需授权。浏览器或设备操作先确认能力及交接；视觉相关任务保留页面、视口、状态和落盘截图，未实际验证不宣称通过。",
								color: "#4c8dff"
							}
						]
					}
				}
			},
			{
				id: "builtin-fullstack",
				document: {
					format: TEAM_PRESET_FORMAT,
					version: 1,
					team: {
						name: "全栈软件研发团队",
						description: "面向复杂的 Web、桌面与 Android 工程。队长调度并验收，架构与设计顾问制定技术契约，独立审查员验证质量，执行者负责开发测试；按风险召集成员并按切片交接。",
						captain: {
							name: "team-lead",
							description: "确定目标、任务写入边界和验收证据，按需调度与最终风险裁决。",
							systemPrompt: "你是工程团队队长，负责范围、调度、依赖、风险和最终验收。具体实现交执行者，专业决策咨询对应顾问。\n1. 仅在用户明确要求团队协作时召集成员；先确认目标平台、项目规则、权限与实际可用工具、验收标准。不得假定服务、浏览器或设备可用，不索取明文秘密。\n2. 任务板按切片记录交付物、验收、依赖、负责人及文件写入范围；仅并行互不冲突的工作。接口契约未确定不得盲目实现；已有任务不重复派发，以消息和状态事件推进，避免空转查询。\n3. executor 持续实施、调试与测试；接口、安全或系统设计风险咨询 backend-architect；新交互或视觉争议咨询 ui-designer；reviewer 负责高风险阶段与交付前独立审查。顾问按需参与，不默认全员并行。\n4. 交接优先使用变更路径、简要差异、测试命令和结果、证据位置、待决风险；详情按需读取，不要求复制完整日志。共享浏览器实行单操作者交接；视觉结论需实际查看落盘截图，缺少证据则标记未验证。\n5. 高风险问题修复后复验；同一问题两轮未解决须重新分析根因。必要验收缺证据不得放行；仍有运行中成员或未闭环任务时不得宣布完成。\n6. 最终汇总交付内容、验证结果、未验证项及风险。Git 暂存与提交遵守项目规则和用户授权；push、发布、改写历史分别取得授权。成员默认不继续委派，例外需明确授权并确认工具支持及隔离范围。",
							color: "#4c8dff"
						},
						members: [
							{
								name: "backend-architect",
								description: "制定后端与系统技术契约，评估关键风险与兼容性。",
								systemPrompt: "你是后端与系统架构顾问，负责技术契约与关键风险，不修改生产代码、测试或生成脚本。\n1. 按任务读取相关调用链与项目约定，延续现有架构，不因局部需求扩展无关设计。\n2. 给出必要的模块边界、API/数据契约、错误语义、鉴权隔离、迁移兼容和性能约束；与 ui-designer 对齐业务状态和反馈。\n3. 交付可实施的简洁契约、涉及路径、验收条件、假设与风险；实现后仅按需核对关键路径，静态检查不得冒充运行验证。\n4. 只写获指派的契约资料，未落地内容标为待完成；生成物由执行者按项目规则产生。默认不继续委派，也不接管日常编码调试。",
								color: "#e0a43c"
							},
							{
								name: "ui-designer",
								description: "制定交互与视觉验收规范，基于真实截图裁定偏差。",
								systemPrompt: "你是 UI/UX 设计顾问，负责交互规范与视觉裁定，不修改生产页面、样式或共享测试。\n1. 读取相关页面、组件、设计令牌与项目规则，延续现有风格，不扩大设计范围。按需覆盖流程、加载/空/错误/校验状态及响应式、无障碍与跨端差异。\n2. 与 backend-architect 对齐字段、状态及错误反馈，交付精简交互规格、涉及页面和可验证验收清单；具体开发交执行者。\n3. 视觉裁定前须亲自用可用图像工具读取落盘截图，记录页面、视口、状态、路径和可见偏差；没有截图或无法读图就标未验证，不以源码或文字替代像素证据。\n4. 获指派后方可操作共享浏览器，遵守单操作者交接；报告裁定、证据和待修问题。只写获指派文档，默认不继续委派。",
								color: "#2fbf71"
							},
							{
								name: "reviewer",
								description: "独立审查实际变更、关键风险与测试有效性。",
								systemPrompt: "你是独立代码审查员，不修改共享生产实现，不以成员自评取代证据。\n1. 围绕实际变更、关键调用链与约定的验收契约审查功能、安全权限、并发、兼容迁移和重要界面状态；不无目的扫描全仓。\n2. 确认测试到达目标路径、关键断言能捕获缺陷；mock、全绿和静态检查均不自动等于真实验证。独立复跑前确认权限与隔离范围，不污染共享文件。\n3. 将发现区分为已证实缺陷、待验证风险与建议；按 P0/P1/P2/P3 报告位置、触发条件、影响、证据和最小修复建议。复审聚焦修复差异与相关回归。\n4. 视觉判断需亲自读取实际截图；视觉设计取舍由 ui-designer 裁定，自己负责独立质量判断。结论为通过、需修改或证据不足；必要项未验证不得放行，风险接受交队长裁决。默认不继续委派。",
								color: "#8d6bff"
							},
							{
								name: "executor",
								description: "负责具体编码、调试、测试、修复与验证交接。",
								systemPrompt: "你是研发执行者，负责获派范围的编码、调试、测试、修复和必要生成脚本。\n1. 先核对任务、项目规则、相关实现、接口契约、文件归属与验收要求；业务歧义交队长澄清，不自行补造规则。\n2. 按最小可验证切片实施，覆盖必要校验、错误处理和回归测试；遵循现有技术栈，不改无关文件或覆盖他人产物。默认不继续委派。\n3. 运行适用的 lint、测试、构建和必要的真实链路，记录命令、结果、失败原因与验证范围；mock 通过不能替代关键真实路径。重要修复补负例，测试失败不得报通过。\n4. 每个检查点交接变更路径、简要差异、测试证据、风险与待决事项；长日志只传位置。按审查意见定点修复，同一问题两轮失败则报告根因并交队长协调。\n5. 生成物按项目流程产生，不手改；提交前核对暂存范围并遵守授权，push 与发布另需授权。浏览器或设备操作先确认能力及交接；视觉相关任务保留页面、视口、状态和落盘截图，未实际验证不宣称通过。",
								color: "#4c8dff"
							}
						]
					}
				}
			}
		];
		BUILTIN_TEAMS.map((entry) => entry.id);
		/**
		* Stable role identity of one shipped member.
		*
		* A member's `id` is the identity a durable member snapshot binds to and the one
		* the runtime re-reads a route through, so a shipped member is stored under a
		* derived identity rather than a random one: restoring the preset a second time
		* addresses the same role instead of creating a second one.
		* @param teamId - identity of the shipped Team that owns the member.
		* @param name - the member's name in the document.
		* @param index - the member's position, used only when the document names none.
		* @returns the role identity a shipped member is stored under.
		*/
		function memberRoleId(teamId, name, index) {
			const label = name.trim();
			return `${teamId}:${label === "" ? String(index + 1) : label}`;
		}
		/**
		* Build one member from a shipped document slot.
		* @param teamId - identity of the shipped Team that owns the member.
		* @param slot - the member's shareable fields.
		* @param index - the member's position in the document.
		* @returns a fresh member carrying the shared fields, no route, and the default tool policy.
		*/
		function memberFromDocument(teamId, slot, index) {
			return {
				...captainFromTransfer(slot),
				id: memberRoleId(teamId, slot.name, index),
				provider: "",
				model: "",
				reasoningEffort: ""
			};
		}
		/**
		* Build the preset one shipped document describes.
		*
		* Everything the document does not carry starts empty, exactly as an import
		* starts: the route follows the Session and the tool policy stays unrestricted.
		* @param entry - the shipped Team to materialize.
		* @returns a fresh preset carrying the document's content.
		*/
		function builtinTeamDefinition(entry) {
			return {
				id: entry.id,
				name: entry.document.team.name,
				description: entry.document.team.description,
				captain: captainFromTransfer(entry.document.team.captain),
				members: entry.document.team.members.map((slot, index) => memberFromDocument(entry.id, slot, index))
			};
		}
		/**
		* Whether two slots carry the same stored fields.
		* @param a - left slot.
		* @param b - right slot.
		* @returns whether every field a slot stores is equal.
		*/
		function sameSlot(a, b) {
			return a.name === b.name && a.color === b.color && a.description === b.description && a.systemPrompt === b.systemPrompt && toolMode(a) === toolMode(b) && a.tools.length === b.tools.length && a.tools.every((tool, index) => tool === b.tools[index]);
		}
		/**
		* Whether two members carry the same stored fields.
		* @param a - left member.
		* @param b - right member.
		* @returns whether every field a member stores is equal.
		*/
		function sameMember(a, b) {
			return sameSlot(a, b) && a.id === b.id && a.provider === b.provider && a.model === b.model && a.reasoningEffort === b.reasoningEffort;
		}
		/**
		* Whether two Teams carry the same stored fields.
		* @param a - left Team.
		* @param b - right Team.
		* @returns whether every field a Team stores is equal.
		*/
		function sameTeam$1(a, b) {
			return a.id === b.id && a.name === b.name && a.description === b.description && sameSlot(a.captain, b.captain) && a.members.length === b.members.length && a.members.every((member, index) => {
				const other = b.members[index];
				return other !== void 0 && sameMember(member, other);
			});
		}
		/**
		* Put one stored Team back at the content of its shipped document.
		*
		* The document wins for everything it carries. A member it still names keeps the
		* route and tool policy the deployment configured for that role — matched by the
		* role identity a previous install gave it, or by name for a member the
		* deployment created itself — and a member the document does not name leaves the
		* roster, because a restored preset is the shipped roster and not a superset of
		* it.
		* @param current - the stored Team being restored.
		* @param entry - the shipped Team it is restored from.
		* @returns the restored Team, keeping the stored identity and every local route.
		*/
		function restoreBuiltinTeam(current, entry) {
			const document = entry.document.team;
			return {
				id: current.id,
				name: document.name,
				description: document.description,
				captain: applySharedFields(current.captain, document.captain),
				members: document.members.map((shared, index) => {
					const key = slotNameKey(shared.name);
					const existing = current.members.find((member) => member.id === memberRoleId(entry.id, shared.name, index)) ?? current.members.find((member) => key !== "" && slotNameKey(member.name) === key);
					return existing === void 0 ? memberFromDocument(entry.id, shared, index) : applySharedFields(existing, shared);
				})
			};
		}
		/**
		* Put every shipped preset back at its document's content.
		*
		* Only the shipped presets are touched: a Team the user created keeps its
		* identity, its content, and its position, and a shipped preset that is missing
		* is appended rather than substituted for anything else. The result is the list
		* the caller stages, so a restore is reviewable and saved like every other edit
		* on the page.
		* @param teams - the Teams the page currently shows.
		* @returns the restored list and the identities that really moved.
		*/
		function restoreBuiltinTeams(teams) {
			const next = [...teams];
			const changed = [];
			for (const entry of BUILTIN_TEAMS) {
				const at = next.findIndex((team) => team.id === entry.id);
				if (at < 0) {
					next.push(builtinTeamDefinition(entry));
					changed.push(entry.id);
					continue;
				}
				const current = next[at];
				const restored = restoreBuiltinTeam(current, entry);
				if (sameTeam$1(current, restored)) continue;
				next[at] = restored;
				changed.push(entry.id);
			}
			return {
				teams: next,
				changed
			};
		}


		/**
		* Staged Team preset editing over the `agent-team-presets` settings namespace,
		* plus the per-Session Team selection the composer control writes.
		*/
		/**
		* Loader entry id of the Host row that owns the Team preset namespace. Spelled
		* here rather than imported: a client package must not depend on a Host package.
		*/
		const TEAM_PRESETS_NS = "agent-team-presets";
		/** Colors offered for a member's accent mark. */
		const AGENT_COLORS = [
			"#4c8dff",
			"#2fbf71",
			"#e0a43c",
			"#e05c6b",
			"#8d6bff",
			"#25b0c4",
			"#c46bd0",
			"#8a94a6"
		];
		/**
		* Resolve the execution state of one Team as the page must show it.
		*
		* A stream that has not delivered its first frame, or that failed, leaves every
		* Team `unknown`: an idle claim the page cannot support is worse than no claim,
		* because the page promises when a save takes effect.
		* @param state - the page state carrying the stream health and its rows.
		* @param teamId - the Team the page is editing.
		* @returns the execution state the footer reports.
		*/
		function executionStateOf(state, teamId) {
			if (state.execution !== "ready") return "unknown";
			return state.executions.find((row) => row.teamId === teamId)?.state ?? "unknown";
		}
		/**
		* Every Team in the open draft that has no name, so the save is withheld.
		*
		* A Team's name is its identity everywhere it is shown: the list, the composer
		* selector, and this page's own breadcrumb each fall back to the raw id when the
		* name is empty. Storing one therefore leaks an id into the UI instead of
		* failing visibly, so the unnamed Teams are named back to the user and refused.
		* @param teams - the Teams in the open draft, in page order.
		* @returns the unnamed Teams, in page order.
		*/
		function unnamedTeamsOf(teams) {
			return teams.filter((team) => team.name.trim() === "");
		}
		/**
		* The resolution one document needs when the user was asked nothing.
		* @param plan - the inspection of the document.
		* @returns the resolution that adds the document as a new Team.
		*/
		function defaultImportResolution(plan) {
			return {
				team: plan.targetIndex === void 0 ? "rename" : "replace",
				teamName: plan.suggestedTeamName,
				captain: "replace",
				members: {}
			};
		}
		/**
		* Overwrite the fields one document carries on the Team it targets.
		*
		* The document wins for the Team's name, purpose, and every agent's shared
		* fields; every field the format does not carry — a member's route and each
		* agent's tool policy — stays exactly as it was. A document member the target
		* does not name is appended, and a target member the document does not mention
		* is kept, so an import never deletes work the document cannot describe.
		* @param target - the configured Team being overwritten.
		* @param plan - the inspection carrying the document and its free replacement names.
		* @param resolution - the choices made for the captain and each colliding member.
		* @returns the overwritten Team, keeping the target's local identity.
		*/
		function mergeTransfer(target, plan, resolution) {
			const members = [...target.members];
			for (const incoming of plan.transfer.team.members) {
				const key = slotNameKey(incoming.name);
				const at = key === "" ? -1 : members.findIndex((member) => slotNameKey(member.name) === key);
				if (at >= 0 && (resolution.members[incoming.name] ?? "replace") === "replace") {
					const existing = members[at];
					if (existing !== void 0) {
						members[at] = applySharedFields(existing, incoming);
						continue;
					}
				}
				const name = uniqueName(incoming.name, members.map((member) => member.name));
				members.push(memberFromTransfer({
					...incoming,
					name
				}));
			}
			const captain = plan.transfer.team.captain;
			const captainName = resolution.captain === "rename" ? plan.suggestedCaptainName : captain.name;
			return {
				id: target.id,
				name: plan.transfer.team.name,
				description: plan.transfer.team.description,
				captain: applySharedFields(target.captain, {
					...captain,
					name: captainName
				}),
				members
			};
		}
		/**
		* Narrow one stored settings section into the two lists this plugin reads.
		*
		* The Host projects exactly the fields its own schema declares, so a served
		* namespace always carries both arrays; a section that carries one of them as
		* something other than a list is still readable as the empty list that field
		* means, because a composer that offers no Team is strictly better than one
		* that refuses to open over a field it does not use.
		* @param value - the namespace value the describe mirror holds.
		* @returns the section, or undefined when the value is not a settings object at all.
		*/
		function sectionOf(value) {
			if (typeof value !== "object" || value === null || Array.isArray(value)) return void 0;
			const section = value;
			return {
				teams: Array.isArray(section.teams) ? section.teams : [],
				selections: Array.isArray(section.selections) ? section.selections : []
			};
		}
		/**
		* Read one thrown value as text a user can act on.
		* @param error - the caught value.
		* @returns its message, or its string form for a non-Error throw.
		*/
		function messageOf(error) {
			return error instanceof Error ? error.message : String(error);
		}
		/**
		* Convert one staged member into the JSON value a settings write carries.
		* @param agent - the staged member.
		* @returns the mutable JSON record the settings document stores.
		*/
		function agentJson(agent) {
			return {
				...agent.id === void 0 ? {} : { id: agent.id },
				name: agent.name,
				color: agent.color,
				description: agent.description,
				provider: agent.provider,
				model: agent.model,
				reasoningEffort: agent.reasoningEffort,
				toolMode: toolMode(agent),
				tools: [...agent.tools],
				systemPrompt: agent.systemPrompt
			};
		}
		/**
		* Convert one staged captain into the JSON value a settings write carries.
		*
		* A captain leads on the model the Session already selected, so the write never
		* restates a route: dropping those members here is what removes them from the
		* stored document.
		* @param captain - the staged captain.
		* @returns the mutable JSON record the settings document stores.
		*/
		function captainJson(captain) {
			return {
				name: captain.name,
				color: captain.color,
				description: captain.description,
				toolMode: toolMode(captain),
				tools: [...captain.tools],
				systemPrompt: captain.systemPrompt
			};
		}
		/**
		* Convert one staged Team into the JSON value a settings write carries.
		* @param team - the staged Team preset.
		* @returns the mutable JSON record the settings document stores.
		*/
		function teamJson(team) {
			return {
				id: team.id,
				name: team.name,
				description: team.description,
				captain: captainJson(team.captain),
				members: team.members.map((member) => agentJson(member))
			};
		}
		/**
		* Whether one stored Team still matches a staged draft, so the page can tell
		* a duplicate from a real edit.
		* @param a - left Team.
		* @param b - right Team.
		* @returns whether both serialize identically.
		*/
		function sameTeam(a, b) {
			return JSON.stringify(a) === JSON.stringify(b);
		}
		/**
		* The name the page shows for one Team.
		* @param team - the Team to name.
		* @returns its display name, or its id while the Team is unnamed.
		*/
		function teamLabel(team) {
			return team.name === "" ? team.id : team.name;
		}
		/**
		* Create an empty Team preset with a unique identity.
		* @param existing - Teams already configured.
		* @returns a new, unnamed Team preset.
		*/
		function createTeamPreset(existing) {
			let index = existing.length + 1;
			let id = `team-${index}`;
			while (existing.some((team) => team.id === id)) {
				index += 1;
				id = `team-${index}`;
			}
			return {
				id,
				name: "",
				description: "",
				captain: emptyCaptainPreset(),
				members: []
			};
		}
		/**
		* Create an empty captain preset.
		* @returns the empty captain every new Team starts from.
		*/
		function emptyCaptainPreset() {
			return {
				name: "",
				color: "",
				description: "",
				toolMode: "all",
				tools: [],
				systemPrompt: ""
			};
		}
		/**
		* Create an empty member preset.
		* @returns the empty preset every new member starts from.
		*/
		function emptyAgentPreset() {
			return {
				...emptyCaptainPreset(),
				id: crypto.randomUUID(),
				provider: "",
				model: "",
				reasoningEffort: ""
			};
		}
		/** Owns the page's staged edits and the composer's immediate selection writes. */
		var TeamPresetsController = class {
			ctx;
			/** Observable page state the slot registrations expose to their components. */
			store;
			form;
			/**
			* The shared describe mirror, which is the authority for the STORED document.
			*
			* Every settings surface in the browser derives from this one mirror, so it
			* answers three questions the form cannot: whether the Host serves the
			* namespace at all, what the stored section holds when this client's own form
			* refuses to decode it, and which revision a write must carry. The form keeps
			* its own job — the page's staged draft, its save fence, and its coordination
			* of a Host write landing behind that draft.
			*/
			mirror;
			unsubscribe;
			unsubscribeMirror;
			draft;
			draftRevision;
			/**
			* The Host's Teams as they stood when the draft opened, by Team id. What the
			* page reconciles an external write against: only a Team whose stored record
			* moved away from this baseline was changed behind the draft.
			*/
			draftBase;
			/**
			* The last external update this page adopted, kept until the user acts on
			* the draft again. Unrelated form changes leave it standing, so the status
			* line is not wiped by a catalogue refresh or another Session's selection.
			*/
			externalUpdate;
			/**
			* The last default-preset restore, kept until the user acts on the draft
			* again, exactly as {@link externalUpdate} is: it reports the click the user
			* just made, not one they already moved past.
			*/
			defaultsRestore;
			/** The last selection write this client could not complete, until the user acts again. */
			selectionFailure;
			/** Whether a write this page started is still crossing the wire. */
			saving = false;
			/** Stream health of the Host execution state, and the frames it delivered. */
			execution = "loading";
			executions = [];
			executionGeneration = 0;
			executionAbort;
			providers = [];
			catalogue = "idle";
			cataloguePartial = false;
			catalogueLoading = false;
			catalogueGeneration = 0;
			tools = [];
			toolCatalogue = "idle";
			toolCatalogueLoading = false;
			disposed = false;
			/**
			* @param ctx - the browser plugin context providing the shared configuration forms.
			*/
			constructor(ctx) {
				this.ctx = ctx;
				this.form = ctx.configForms.get(TEAM_PRESETS_NS);
				this.mirror = ctx.configForms.describe();
				this.store = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(this.projection());
				this.unsubscribe = this.form.subscribe(() => {
					this.reconcile();
					this.publish();
				});
				this.unsubscribeMirror = this.mirror.subscribe(() => {
					this.publish();
				});
			}
			/** Release the form and mirror subscriptions and the execution stream. */
			dispose() {
				this.disposed = true;
				this.executionGeneration += 1;
				this.executionAbort?.abort();
				this.executionAbort = void 0;
				this.unsubscribe();
				this.unsubscribeMirror();
			}
			projection() {
				const stored = this.storedSection();
				return {
					status: this.documentStatus(),
					writable: this.documentWritable(),
					saving: false,
					failed: false,
					teams: this.visibleTeams(),
					selections: stored?.selections ?? [],
					dirty: this.draft !== void 0,
					externalUpdate: this.externalUpdate,
					defaults: this.defaultsRestore,
					formIssue: this.formIssue(),
					selectionFailure: this.selectionFailure,
					execution: this.execution,
					executions: this.executions,
					providers: this.providers,
					catalogue: this.catalogue,
					cataloguePartial: this.cataloguePartial,
					tools: this.tools,
					toolCatalogue: this.toolCatalogue
				};
			}
			/**
			* Whether the stored document is usable, as the describe mirror reports it.
			*
			* The mirror answers even when the shared form does not: a form parked at
			* `loading` because it refused the stored value still leaves a served
			* namespace with a readable value and a writable document, and gating the
			* composer on the form is what turned that into a control that opened a menu
			* and then did nothing.
			* @returns the stored document's state.
			*/
			documentStatus() {
				const mirrored = this.mirror.getSnapshot();
				if (mirrored.view === void 0) return mirrored.status === "unavailable" ? "unavailable" : "loading";
				return this.namespaceView() === void 0 ? "unavailable" : "ready";
			}
			/**
			* The Host's view of the Team namespace, or undefined while it serves none.
			* @returns the namespace view the describe mirror currently holds.
			*/
			namespaceView() {
				return this.mirror.getSnapshot().view?.namespaces.find((row) => row.ns === TEAM_PRESETS_NS);
			}
			/**
			* The stored section this client reads and writes.
			*
			* The mirror wins whenever it holds an answer, because it is the same value
			* every other settings surface derives from and it survives a namespace whose
			* stored section this client's own form refused to decode. The form's accepted
			* value is the fallback only for the window before the first describe answer,
			* where the form may hold a section the mirror has not published yet: once the
			* mirror HAS answered, a namespace it does not list is not served, and the
			* form's older value must not be shown as if it were stored.
			* @returns the stored Teams and selections, or undefined while nothing is known.
			*/
			storedSection() {
				if (this.mirror.getSnapshot().view !== void 0) return sectionOf(this.namespaceView()?.value);
				const accepted = this.form.getSnapshot().value;
				return accepted === void 0 ? void 0 : {
					teams: accepted.teams,
					selections: accepted.selections
				};
			}
			/**
			* Whether the stored document accepts writes.
			*
			* A namespace the Host never composed accepts none, whatever the document's
			* own writability says: there is no section to write into, and reporting the
			* document as writable there is what let the composer offer a control whose
			* every click was refused.
			* @returns whether a selection can be written right now.
			*/
			documentWritable() {
				const view = this.mirror.getSnapshot().view;
				if (view === void 0) return this.form.getSnapshot().writable;
				return this.namespaceView() === void 0 ? false : view.writable;
			}
			/**
			* Name why the stored section cannot be edited, when it cannot.
			* @returns the condition, or undefined when this page can edit and save.
			*/
			formIssue() {
				const mirrored = this.mirror.getSnapshot();
				if (mirrored.view === void 0) return mirrored.status === "unavailable" ? "settings-unavailable" : void 0;
				if (this.namespaceView() === void 0) return "namespace-missing";
				return this.form.getSnapshot().status === "ready" ? void 0 : "schema-rejected";
			}
			publish(patch = {}) {
				if (this.disposed) return;
				this.store.set({
					...this.projection(),
					...patch
				});
			}
			/**
			* The Teams the page currently shows.
			*
			* A draft shadows the stored value while one is open, so an export and an
			* import both see exactly what the user sees.
			* @returns the staged Teams, or the stored ones while nothing is staged.
			*/
			visibleTeams() {
				return this.draft ?? this.storedSection()?.teams ?? [];
			}
			/**
			* Fold a stored change that landed behind an open draft into the draft.
			*
			* An Agent that rewrites a Team through its tools saves without this page, so
			* the stored record of that Team is the newer definition and wins over the
			* staged one; every other Team keeps its unsaved edit. A Team the Host moved
			* away from the baseline the draft was opened on is adopted whole, a Team the
			* Host deleted leaves the draft, and a Team the Host added joins it — the
			* draft is the page's whole document, so saving it must neither drop what the
			* Host gained nor resurrect what the Host removed. A Team this page added
			* itself is the page's own and is never touched. The fence follows the Host
			* revision so what stays staged can still be saved.
			*
			* Once nothing but Host records remain, the draft is dropped rather than left
			* staged with nothing to write — including when a stored write landed on the
			* value the draft already held, which needs no replacement and is no conflict.
			* Everything the coordination did is reported through {@link externalUpdate},
			* naming what changed and whether a staged edit was replaced or dropped; a
			* change that coordinates nothing leaves the report standing.
			*
			* A write this page started owns the draft until it settles: its own
			* accepted view and the read a refusal triggers must never roll back or
			* discard what the user had staged when they pressed Save.
			*/
			reconcile() {
				if (this.draft === void 0 || this.saving) return;
				const snapshot = this.form.getSnapshot();
				const stored = snapshot.value?.teams;
				const base = this.draftBase;
				if (snapshot.status !== "ready" || stored === void 0 || base === void 0) return;
				const hosts = new Map(stored.map((team) => [team.id, team]));
				const draft = this.draft;
				const staged = new Set(draft.map((team) => team.id));
				const adopted = [];
				const removed = [];
				const kept = [];
				for (const team of draft) {
					const host = hosts.get(team.id);
					const before = base.get(team.id);
					if (before === void 0) {
						kept.push(team);
						continue;
					}
					if (host === void 0) {
						removed.push({
							name: teamLabel(team),
							edited: !sameTeam(before, team)
						});
						continue;
					}
					if (sameTeam(before, host) || sameTeam(team, host)) {
						kept.push(team);
						continue;
					}
					adopted.push({
						name: teamLabel(host),
						overridden: !sameTeam(before, team)
					});
					kept.push(structuredClone(host));
				}
				const added = stored.filter((host) => !staged.has(host.id) && !base.has(host.id));
				this.draftBase = new Map(stored.map((team) => [team.id, structuredClone(team)]));
				this.draftRevision = snapshot.revision;
				const coordinated = adopted.length > 0 || removed.length > 0 || added.length > 0;
				if (coordinated) this.externalUpdate = {
					teams: adopted.map((entry) => entry.name),
					overridden: adopted.filter((entry) => entry.overridden).map((entry) => entry.name),
					added: added.map(teamLabel),
					removed: removed.map((entry) => entry.name),
					removedEdited: removed.filter((entry) => entry.edited).map((entry) => entry.name)
				};
				const next = added.length === 0 ? kept : [...kept, ...added.map((host) => structuredClone(host))];
				if (next.length === stored.length && next.every((team, index) => {
					const host = stored[index];
					return host !== void 0 && sameTeam(team, host);
				})) {
					this.draft = void 0;
					this.draftBase = void 0;
					this.draftRevision = void 0;
					return;
				}
				if (!coordinated) return;
				this.draft = next;
			}
			/**
			* The business face both slot registrations inject.
			* @returns the state store and the page and composer callbacks.
			*/
			inject() {
				return {
					hooks: { teamPresets: this.store },
					createTeam: () => this.createTeam(),
					duplicateTeam: (index) => this.duplicateTeam(index),
					restoreDefaults: () => {
						this.restoreDefaults();
					},
					exportTeam: (index) => this.exportTeam(index),
					inspectImport: (text) => this.inspectImport(text),
					applyImport: (plan, resolution) => {
						return this.applyImport(plan, resolution);
					},
					removeTeam: (index) => {
						this.removeTeam(index);
					},
					addMember: (teamIndex) => {
						this.addMember(teamIndex);
					},
					removeMember: (teamIndex, memberIndex) => {
						this.removeMember(teamIndex, memberIndex);
					},
					patchTeam: (index, patch) => {
						this.patchTeam(index, patch);
					},
					patchCaptain: (teamIndex, patch) => {
						this.patchCaptain(teamIndex, patch);
					},
					patchMember: (teamIndex, memberIndex, patch) => {
						this.patchMember(teamIndex, memberIndex, patch);
					},
					save: () => this.save(),
					discard: () => {
						this.discard();
					},
					selectTeam: (sessionId, teamId) => this.selectTeam(sessionId, teamId),
					loadCatalogue: () => {
						this.loadCatalogue();
					},
					refreshCatalogue: () => {
						this.refreshCatalogue();
					}
				};
			}
			/** Read the provider/model catalogue, the tool catalogue, and the execution stream. */
			loadCatalogue() {
				this.loadModelCatalogue();
				this.loadToolCatalogue();
				this.ensureExecution();
			}
			/**
			* Open the Host execution stream unless this generation already holds one.
			*
			* The stream is the page's only live source of "is this Team executing", so
			* every page load and every Host notification re-subscribes a stream that
			* ended or failed — without a timer, and without trusting the last frame a
			* dead generation left behind.
			*/
			ensureExecution() {
				if (this.disposed || this.executionAbort !== void 0) return;
				const abort = new AbortController();
				this.executionAbort = abort;
				const generation = ++this.executionGeneration;
				this.execution = "loading";
				this.executions = [];
				this.publish();
				this.consumeExecution(abort, generation);
			}
			/**
			* Read whole-set execution frames until the stream ends.
			* @param abort - the generation's cancellation.
			* @param generation - the generation this read owns; a superseded read publishes nothing.
			*/
			async consumeExecution(abort, generation) {
				try {
					for await (const frame of this.ctx.remote.teamPresets.execution(abort.signal)) {
						if (this.disposed || generation !== this.executionGeneration) return;
						this.execution = "ready";
						this.executions = frame.teams;
						this.publish();
					}
					this.failExecution(generation);
				} catch (_failure) {
					this.failExecution(generation);
				}
			}
			/**
			* Record that the Host execution state is unknown.
			*
			* A stream that failed, or that ended without being cancelled, says nothing
			* about any Team: its last frame is dropped rather than kept as live truth.
			* @param generation - the generation whose read ended.
			*/
			failExecution(generation) {
				if (this.disposed || generation !== this.executionGeneration) return;
				this.executionAbort = void 0;
				this.execution = "error";
				this.executions = [];
				this.publish();
			}
			/**
			* Discard both catalogues and read them again from the Host.
			*
			* The Host catalogue is not part of any settings section: adapters,
			* credentials, and other settings documents change which routes exist, and a
			* provider may simply have been unavailable when this plugin mounted. Every
			* caller therefore asks for a fresh read instead of reusing the one already
			* held, and an answer still in flight is fenced out by
			* {@link catalogueGeneration} so it cannot overwrite the newer one.
			*/
			refreshCatalogue() {
				if (this.disposed) return;
				this.catalogueGeneration += 1;
				this.catalogueLoading = false;
				this.catalogue = "idle";
				this.cataloguePartial = false;
				this.toolCatalogueLoading = false;
				this.toolCatalogue = "idle";
				this.publish();
				this.loadCatalogue();
			}
			/**
			* Whether one catalogue answer still belongs to the current read.
			* @param generation - the read generation captured when the request started.
			* @returns whether the answer may be published.
			*/
			acceptsCatalogue(generation) {
				return !this.disposed && generation === this.catalogueGeneration;
			}
			/**
			* Read one namespaced Remote service, reporting a context that cannot reach it.
			*
			* A namespaced service resolves relative to the context that reads it: the
			* reading fiber (or an ancestor in the same isolate) must declare
			* `remote.<namespace>` in its own inject set, and a context that does not
			* throws `cannot get property "remote.<namespace>" without inject` on the
			* property access itself. That throw is synchronous, so an unguarded read from
			* inside plugin assembly takes the whole registration with it — this plugin
			* would rather publish the catalogue as failed and keep the page and the
			* composer mounted, because a UI that says which read failed is worth more
			* than one that never appears.
			* @param read - the property access to attempt.
			* @returns the read, or undefined when this context cannot reach the service.
			*/
			readNamespace(read) {
				try {
					return read();
				} catch (_unreachable) {
					return;
				}
			}
			loadModelCatalogue() {
				if (this.catalogueLoading || this.catalogue === "ready") return;
				const generation = this.catalogueGeneration;
				this.catalogueLoading = true;
				this.catalogue = "loading";
				this.publish();
				const read = this.readNamespace(() => this.ctx.remote.session.modelCatalog());
				if (read === void 0) {
					this.catalogue = "error";
					this.catalogueLoading = false;
					this.publish();
					return;
				}
				read.then((result) => {
					if (!this.acceptsCatalogue(generation)) return;
					if (!result.ok) throw new Error(result.error.message);
					this.providers = result.value.groups.map((group) => describeGroup(group));
					this.cataloguePartial = result.value.failures.length > 0;
					this.catalogue = "ready";
					this.catalogueLoading = false;
					this.publish();
				}).catch(() => {
					if (!this.acceptsCatalogue(generation)) return;
					this.catalogue = "error";
					this.catalogueLoading = false;
					this.publish();
				});
			}
			loadToolCatalogue() {
				if (this.toolCatalogueLoading || this.toolCatalogue === "ready") return;
				const generation = this.catalogueGeneration;
				this.toolCatalogueLoading = true;
				this.toolCatalogue = "loading";
				this.publish();
				const read = this.readNamespace(() => this.ctx.remote.teamPresets.catalog());
				if (read === void 0) {
					this.toolCatalogue = "error";
					this.toolCatalogueLoading = false;
					this.publish();
					return;
				}
				read.then((result) => {
					if (!this.acceptsCatalogue(generation)) return;
					if (!result.ok) throw new Error(result.error.message);
					this.tools = result.value.tools.map((tool) => ({
						name: tool.name,
						description: tool.description,
						source: tool.source,
						...tool.captainOnly === true ? { captainOnly: true } : {},
						...tool.server === void 0 ? {} : { server: tool.server }
					}));
					this.toolCatalogue = "ready";
					this.toolCatalogueLoading = false;
					this.publish();
				}).catch(() => {
					if (!this.acceptsCatalogue(generation)) return;
					this.toolCatalogue = "error";
					this.toolCatalogueLoading = false;
					this.publish();
				});
			}
			/**
			* Open the staged draft from the stored Teams.
			*
			* The published snapshot is deep-frozen outside production, so every edit
			* rebuilds the array and the touched record instead of mutating either. A
			* user edit also retires the last external-update report: the page is once
			* again acting on the draft the user holds.
			* @returns the current staged Teams.
			*/
			beginDraft() {
				this.externalUpdate = void 0;
				this.defaultsRestore = void 0;
				if (this.draft === void 0) {
					const snapshot = this.form.getSnapshot();
					const stored = snapshot.value?.teams ?? [];
					this.draft = structuredClone(stored);
					this.draftBase = new Map(stored.map((team) => [team.id, structuredClone(team)]));
					this.draftRevision = snapshot.revision;
				}
				return this.draft;
			}
			/**
			* Replace one Team record and publish.
			* @param index - the Team position to replace.
			* @param next - the replacement record.
			*/
			replaceTeam(index, next) {
				const draft = this.beginDraft();
				/* v8 ignore next -- every caller checks the staged position before delegating. */
				if (draft[index] === void 0) return;
				this.draft = draft.map((team, position) => position === index ? next : team);
				this.publish();
			}
			/**
			* Append a new Team and open it.
			* @returns the new Team's identity.
			*/
			createTeam() {
				const draft = this.beginDraft();
				const created = createTeamPreset(draft);
				this.draft = [...draft, created];
				this.publish();
				return created.id;
			}
			/**
			* Copy one Team under a new identity.
			* @param index - the Team to copy.
			* @returns the copy's identity, or undefined for an unknown position.
			*/
			duplicateTeam(index) {
				const draft = this.beginDraft();
				const source = draft[index];
				if (source === void 0) return void 0;
				const copy = {
					...structuredClone(source),
					id: createTeamPreset(draft).id,
					name: source.name === "" ? "" : `${source.name} copy`
				};
				this.draft = [
					...draft.slice(0, index + 1),
					copy,
					...draft.slice(index + 1)
				];
				this.publish();
				return copy.id;
			}
			/**
			* Put the shipped default presets back at their document's content.
			*
			* Only the presets this plugin ships are touched: a Team the user created
			* keeps its identity, its content, and its position, and the model route and
			* tool policy configured for a shipped preset's slots are kept too, exactly as
			* an import keeps them — a shared document cannot be evidence for discarding a
			* local setting it does not carry. What the restore produces is staged, so it
			* is visible and saved like every other edit on the page; a restore that would
			* change nothing stages nothing and reports that instead of opening an empty
			* draft.
			* @returns how the restore resolved.
			*/
			restoreDefaults() {
				const restored = restoreBuiltinTeams(this.visibleTeams());
				if (restored.changed.length === 0) {
					this.defaultsRestore = "unchanged";
					this.publish();
					return "unchanged";
				}
				this.beginDraft();
				this.draft = restored.teams;
				this.defaultsRestore = "restored";
				this.publish();
				return "restored";
			}
			/**
			* Serialize one Team as the fixed shareable document.
			* @param index - the Team position to export.
			* @returns the document text, or undefined for a position the page does not show.
			*/
			exportTeam(index) {
				const team = this.visibleTeams()[index];
				return team === void 0 ? void 0 : serializeTeamPreset(team);
			}
			/**
			* Read one document and work out what importing it would collide with.
			*
			* Nothing is staged here: the caller decides whether the plan needs the user's
			* answer before {@link applyImport} touches the draft.
			* @param text - the document text the user chose.
			* @returns the plan, or the reason the document is not a Team preset of this format.
			*/
			inspectImport(text) {
				const parsed = parseTeamPresetText(text);
				if (!parsed.ok) return parsed;
				return {
					ok: true,
					plan: {
						transfer: parsed.transfer,
						...importConflicts(this.visibleTeams(), parsed.transfer)
					}
				};
			}
			/**
			* Stage one inspected document onto the draft.
			*
			* The document carries no identity, so it either overwrites the Team it is
			* named after — keeping that Team's local id, routes, and tool policies — or
			* joins the draft as a new Team under the resolved name.
			* @param plan - the inspection produced by {@link inspectImport}.
			* @param resolution - the user's answer for every collision in the plan.
			* @returns the identity of the staged Team.
			*/
			applyImport(plan, resolution) {
				const draft = this.beginDraft();
				const target = plan.targetIndex === void 0 ? void 0 : draft[plan.targetIndex];
				if (resolution.team === "replace" && target !== void 0) {
					const merged = mergeTransfer(target, plan, resolution);
					this.draft = draft.map((team, position) => position === plan.targetIndex ? merged : team);
					this.publish();
					return target.id;
				}
				const name = uniqueName(resolution.teamName.trim() === "" ? plan.transfer.team.name : resolution.teamName, draft.map((team) => team.name));
				const created = {
					...teamFromTransfer(plan.transfer, createTeamPreset(draft).id),
					name
				};
				this.draft = [...draft, created];
				this.publish();
				return created.id;
			}
			/**
			* Delete one Team.
			* @param index - the Team to delete.
			*/
			removeTeam(index) {
				const draft = this.beginDraft();
				this.draft = draft.filter((_, position) => position !== index);
				this.publish();
			}
			/**
			* Replace fields of one Team.
			* @param index - the Team to patch.
			* @param patch - the changed fields.
			*/
			patchTeam(index, patch) {
				const current = this.beginDraft()[index];
				if (current === void 0) return;
				this.replaceTeam(index, {
					...current,
					...patch
				});
			}
			/**
			* Replace fields of one Team's captain.
			* @param teamIndex - the Team whose captain changes.
			* @param patch - the changed fields.
			*/
			patchCaptain(teamIndex, patch) {
				const current = this.beginDraft()[teamIndex];
				if (current === void 0) return;
				this.replaceTeam(teamIndex, {
					...current,
					captain: {
						...current.captain,
						...patch
					}
				});
			}
			/**
			* Replace fields of one member.
			* @param teamIndex - the Team that owns the member.
			* @param memberIndex - the member position.
			* @param patch - the changed fields.
			*/
			patchMember(teamIndex, memberIndex, patch) {
				const team = this.beginDraft()[teamIndex];
				const member = team?.members[memberIndex];
				if (team === void 0 || member === void 0) return;
				this.replaceTeam(teamIndex, {
					...team,
					members: team.members.map((entry, position) => position === memberIndex ? {
						...entry,
						...patch
					} : entry)
				});
			}
			/**
			* Append an empty member to one Team.
			* @param teamIndex - the Team that gains a member.
			*/
			addMember(teamIndex) {
				const team = this.beginDraft()[teamIndex];
				if (team === void 0) return;
				this.replaceTeam(teamIndex, {
					...team,
					members: [...team.members, emptyAgentPreset()]
				});
			}
			/**
			* Remove one member from a Team.
			* @param teamIndex - the Team that owns the member.
			* @param memberIndex - the member position.
			*/
			removeMember(teamIndex, memberIndex) {
				const team = this.beginDraft()[teamIndex];
				if (team === void 0) return;
				this.replaceTeam(teamIndex, {
					...team,
					members: team.members.filter((_, position) => position !== memberIndex)
				});
			}
			/** Write the staged Teams. */
			async save() {
				const snapshot = this.form.getSnapshot();
				if (this.draft === void 0 || snapshot.status !== "ready" || !snapshot.writable) {
					if (this.draft !== void 0) this.publish({ failed: true });
					return;
				}
				const draft = this.draft;
				const revision = this.draftRevision;
				this.saving = true;
				this.externalUpdate = void 0;
				this.publish({
					saving: true,
					failed: false
				});
				let landed = false;
				try {
					landed = await this.form.mutate([{
						op: "set",
						path: ["teams"],
						value: draft.map((team) => teamJson(team))
					}], revision);
				} finally {
					this.saving = false;
				}
				if (this.disposed) return;
				if (landed) {
					this.draft = void 0;
					this.draftBase = void 0;
					this.draftRevision = void 0;
					this.defaultsRestore = void 0;
				} else this.reconcile();
				this.publish({
					saving: false,
					failed: !landed
				});
			}
			/** Drop every staged edit. */
			discard() {
				if (this.draft === void 0) return;
				this.draft = void 0;
				this.draftBase = void 0;
				this.draftRevision = void 0;
				this.externalUpdate = void 0;
				this.defaultsRestore = void 0;
				this.publish();
			}
			/**
			* Apply one Team to a Session, or clear its Team.
			*
			* The write goes through the Host's own `settings.mutate` with the revision
			* the describe mirror holds, which is what makes a refusal reportable: the
			* shared form's `mutate` answers only a boolean, so a refused selection used
			* to be indistinguishable from one that never happened. The mirror's answer
			* is folded back exactly as the shared form folds it, so every other settings
			* surface sees the selection immediately.
			*
			* One retry follows a refusal. A refused write triggers the mirror's recovery
			* read, so the retry carries the revision and the section the Host holds now —
			* a fence that was stale when the user clicked is then a real retry rather
			* than the same conflict forever, and a concurrent selection is preserved
			* instead of being overwritten by the array this attempt first built.
			* @param sessionId - the Session whose Team changes.
			* @param teamId - the selected Team identity; undefined clears the selection.
			* @returns once the write settled; the outcome is published on {@link store}.
			*/
			async selectTeam(sessionId, teamId) {
				this.selectionFailure = void 0;
				this.publish();
				const view = this.namespaceView();
				if (view === void 0 || this.storedSection() === void 0 || !this.documentWritable()) {
					this.failSelection({
						kind: "unavailable",
						sessionId,
						teamId,
						detail: void 0
					});
					return;
				}
				const attempt = await this.writeSelection(sessionId, teamId, view.revision);
				if (attempt.kind === "landed") return;
				const recovered = this.namespaceView();
				const retried = recovered === void 0 ? attempt : await this.writeSelection(sessionId, teamId, recovered.revision);
				if (retried.kind === "landed") return;
				this.failSelection({
					kind: retried.kind,
					sessionId,
					teamId,
					detail: retried.detail
				});
			}
			/**
			* Write one selection under one revision fence.
			* @param sessionId - the Session whose Team changes.
			* @param teamId - the selected Team identity; undefined clears the selection.
			* @param revision - the revision the write is fenced on.
			* @returns the outcome, with the Host's own refusal text when it refused.
			*/
			async writeSelection(sessionId, teamId, revision) {
				const stored = this.storedSection();
				/* v8 ignore next -- every caller resolves the section before it writes. */
				if (stored === void 0) return {
					kind: "failed",
					detail: void 0
				};
				const ops = [{
					op: "set",
					path: ["selections"],
					value: withSelection(stored.selections, sessionId, teamId).map((record) => ({
						sessionId: record.sessionId,
						teamId: record.teamId
					}))
				}];
				let response;
				try {
					response = await this.ctx.remote.settings.mutate(TEAM_PRESETS_NS, ops, revision);
				} catch (error) {
					await this.refreshStored();
					return {
						kind: "failed",
						detail: messageOf(error)
					};
				}
				if (this.disposed) return { kind: "landed" };
				if (!response.ok) {
					await this.refreshStored();
					return {
						kind: "refused",
						detail: response.error.message
					};
				}
				this.mirror.acceptView(response.value);
				return { kind: "landed" };
			}
			/**
			* Re-read the Host document after a write this client could not complete.
			*
			* The cross-namespace describe contract exposes `ensure`, which reads only
			* from an idle mirror, and a refused write is exactly the case where a HELD
			* view is stale. The read below is the same namespace read the mirror itself
			* performs and `acceptView` is the contract's own fold, so the shared document
			* is refreshed without reaching past the face the contract publishes.
			* @returns settlement once a refreshed view, when there is one, is folded.
			*/
			async refreshStored() {
				try {
					const response = await this.ctx.remote.settings.describe();
					if (!response.ok) return;
					const view = response.value.namespaces.find((row) => row.ns === TEAM_PRESETS_NS);
					if (view !== void 0) this.mirror.acceptView(view);
				} catch (_unreachable) {}
			}
			/**
			* Publish one selection failure for the page and the composer control.
			* @param failure - the refusal or failure to report.
			*/
			failSelection(failure) {
				this.selectionFailure = failure;
				this.publish();
			}
		};
		/** Narrow one catalogue group into picker choices. */
		function describeGroup(group) {
			return {
				id: group.id,
				name: group.name,
				models: group.models.map((model) => ({
					id: model.id,
					name: model.name,
					efforts: (model.reasoning?.efforts ?? []).map((effort) => ({
						id: effort.id,
						name: effort.name
					}))
				}))
			};
		}


		const key = "dsh-agent-team-presets:client/TeamPresetsSection.module.css";
		if (typeof document !== "undefined" && !document.querySelector("style[data-team-presets-style=\"dsh-agent-team-presets:client/TeamPresetsSection.module.css\"]")) {
			const style = document.createElement("style");
			style.dataset.teamPresetsStyle = key;
			style.textContent = "._628ArG_section{min-height:100%;color:var(--dsw-alias-label-primary);flex-direction:column;display:flex}._628ArG_page{flex-direction:column;gap:10px;max-width:520px;padding-bottom:8px;display:flex}._628ArG_pageHead{flex-direction:column;gap:2px;display:flex}._628ArG_crumb{color:var(--dsw-alias-label-tertiary);font:inherit;cursor:pointer;background:0 0;border:none;align-self:flex-start;align-items:center;gap:4px;padding:0;font-size:12px;line-height:18px;display:inline-flex}._628ArG_crumb:hover{color:var(--dsw-alias-label-primary)}._628ArG_title{margin:0;font-size:15px;font-weight:500;line-height:22px}._628ArG_intro{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:18px}._628ArG_empty{color:var(--dsw-alias-label-tertiary);margin:4px 0;font-size:12px;line-height:18px}._628ArG_sectionTitle{color:var(--dsw-alias-label-secondary);padding-top:2px;font-size:12px;line-height:18px}._628ArG_actionRow{gap:8px;display:flex}._628ArG_fileInput{display:none}._628ArG_conflict{flex-direction:column;gap:6px;display:flex}._628ArG_conflict+._628ArG_conflict{margin-top:16px}._628ArG_conflictLead{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}._628ArG_conflictName{overflow-wrap:anywhere;font-size:13px;font-weight:500;line-height:18px}._628ArG_conflictMember{flex-wrap:wrap;justify-content:space-between;align-items:center;gap:6px 12px;display:flex}._628ArG_choiceRow{flex-wrap:wrap;gap:12px;display:flex}._628ArG_choice{cursor:pointer;align-items:center;gap:6px;font-size:12px;line-height:18px;display:inline-flex}._628ArG_card{border:.5px solid var(--dsw-alias-settings-card-stroke);background:var(--dsw-alias-settings-card-fill);border-radius:var(--dsw-radius-xl);flex-direction:column;gap:10px;padding:10px 12px;display:flex}._628ArG_cardHead{justify-content:space-between;align-items:center;gap:8px;display:flex}._628ArG_cardTitle{font-size:13px;font-weight:500;line-height:20px}._628ArG_rows,._628ArG_plainRows{flex-direction:column;gap:8px;margin:0;padding:0;list-style:none;display:flex}._628ArG_rows>._628ArG_card{flex-direction:row;align-items:center;gap:4px;padding:6px 8px 6px 10px}._628ArG_entry{align-items:center;gap:4px;display:flex}._628ArG_entryRow,._628ArG_rowMain{min-width:0;color:inherit;font:inherit;text-align:left;border-radius:var(--dsw-radius-md);cursor:pointer;background:0 0;border:none;flex:auto;align-items:center;gap:8px;padding:4px 2px;display:flex}._628ArG_rowMain:hover,._628ArG_entryRow:hover{background:var(--dsw-alias-interactive-bg-hover)}._628ArG_rowText{flex-direction:column;flex:auto;min-width:0;display:flex}._628ArG_rowName{text-overflow:ellipsis;white-space:nowrap;font-size:13px;line-height:18px;overflow:hidden}._628ArG_rowMeta{color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;font-size:11px;line-height:16px;overflow:hidden}._628ArG_rowActions{flex:none;gap:2px;display:flex}._628ArG_chevron{color:var(--dsw-alias-label-tertiary);flex:none;font-size:14px;line-height:18px}._628ArG_dot{background:var(--dsw-alias-label-tertiary);border-radius:50%;flex:none;width:10px;height:10px}._628ArG_field{flex-direction:column;gap:4px;min-width:0;display:flex}._628ArG_fieldLabel{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}._628ArG_input{width:100%}._628ArG_toolGroup{flex-direction:column;gap:6px;min-width:0;display:flex}._628ArG_toolGroupHead{justify-content:space-between;align-items:center;gap:8px;min-width:0;display:flex}._628ArG_toolGroupToggle{min-width:0;color:inherit;font:inherit;text-align:left;cursor:pointer;background:0 0;border:none;align-items:center;gap:6px;padding:0;display:flex}._628ArG_toolGroupCount{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;font-size:12px;line-height:18px}._628ArG_toolGrid{grid-template-columns:repeat(auto-fit,minmax(min(100%,140px),1fr));gap:10px 12px;min-width:0;display:grid}._628ArG_toolCheckbox{align-items:flex-start;min-width:0}._628ArG_toolCheckbox>span{overflow-wrap:anywhere}._628ArG_hint{color:var(--dsw-alias-label-tertiary);margin:0;font-size:11px;line-height:17px}._628ArG_warn{color:var(--dsw-alias-state-warn-label);margin:0;font-size:11px;line-height:17px}._628ArG_select{border-radius:var(--dsw-radius-lg);border:.5px solid var(--dsw-alias-settings-card-stroke);background:var(--dsw-alias-bg-base);width:100%;height:30px;color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;justify-content:space-between;align-items:center;gap:6px;padding:0 8px;font-size:12px;display:flex}._628ArG_select:disabled{opacity:.5;cursor:default}._628ArG_selectLabel{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}._628ArG_prompt{box-sizing:border-box;border-radius:var(--dsw-radius-lg);border:.5px solid var(--dsw-alias-settings-card-stroke);background:var(--dsw-alias-bg-base);width:100%;color:var(--dsw-alias-label-primary);font:inherit;resize:vertical;padding:8px;font-size:12px;line-height:18px}._628ArG_prompt:disabled{opacity:.6}._628ArG_swatches{flex-wrap:wrap;align-items:center;gap:6px;display:flex}._628ArG_swatch,._628ArG_swatchNone{border:.5px solid var(--dsw-alias-settings-card-stroke);cursor:pointer;border-radius:50%;width:18px;height:18px;padding:0}._628ArG_swatch[aria-pressed=true],._628ArG_swatchNone[aria-pressed=true]{outline:2px solid var(--dsw-alias-label-primary);outline-offset:1px}._628ArG_swatchNone{background:var(--dsw-alias-bg-base)}._628ArG_footer{background:var(--dsw-alias-bg-base);justify-content:flex-end;align-items:center;gap:10px;margin-top:auto;padding:8px 0 4px;display:flex;position:sticky;bottom:0}._628ArG_footerNotes{flex-direction:column;align-items:flex-start;gap:2px;min-width:0;margin-right:auto;display:flex}._628ArG_footerActions{white-space:nowrap;flex-shrink:0;align-items:center;gap:10px;display:flex}._628ArG_footerNote{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:17px}";
			document.head.appendChild(style);
		}
		var TeamPresetsSection_module_css_default = {
			"section": "_628ArG_section",
			"choiceRow": "_628ArG_choiceRow",
			"toolGroup": "_628ArG_toolGroup",
			"plainRows": "_628ArG_plainRows",
			"input": "_628ArG_input",
			"field": "_628ArG_field",
			"footerActions": "_628ArG_footerActions",
			"toolGroupCount": "_628ArG_toolGroupCount",
			"select": "_628ArG_select",
			"cardTitle": "_628ArG_cardTitle",
			"rowMain": "_628ArG_rowMain",
			"title": "_628ArG_title",
			"conflictName": "_628ArG_conflictName",
			"intro": "_628ArG_intro",
			"rowMeta": "_628ArG_rowMeta",
			"chevron": "_628ArG_chevron",
			"actionRow": "_628ArG_actionRow",
			"warn": "_628ArG_warn",
			"footer": "_628ArG_footer",
			"card": "_628ArG_card",
			"toolGroupToggle": "_628ArG_toolGroupToggle",
			"sectionTitle": "_628ArG_sectionTitle",
			"prompt": "_628ArG_prompt",
			"crumb": "_628ArG_crumb",
			"fieldLabel": "_628ArG_fieldLabel",
			"swatches": "_628ArG_swatches",
			"rows": "_628ArG_rows",
			"conflictLead": "_628ArG_conflictLead",
			"entryRow": "_628ArG_entryRow",
			"footerNotes": "_628ArG_footerNotes",
			"conflict": "_628ArG_conflict",
			"swatch": "_628ArG_swatch",
			"hint": "_628ArG_hint",
			"choice": "_628ArG_choice",
			"rowActions": "_628ArG_rowActions",
			"fileInput": "_628ArG_fileInput",
			"toolGroupHead": "_628ArG_toolGroupHead",
			"pageHead": "_628ArG_pageHead",
			"footerNote": "_628ArG_footerNote",
			"toolCheckbox": "_628ArG_toolCheckbox",
			"empty": "_628ArG_empty",
			"cardHead": "_628ArG_cardHead",
			"dot": "_628ArG_dot",
			"rowText": "_628ArG_rowText",
			"rowName": "_628ArG_rowName",
			"toolGrid": "_628ArG_toolGrid",
			"conflictMember": "_628ArG_conflictMember",
			"selectLabel": "_628ArG_selectLabel",
			"swatchNone": "_628ArG_swatchNone",
			"entry": "_628ArG_entry",
			"page": "_628ArG_page"
		};


		/**
		* The labelled dropdown one Team field renders: a full-width trigger button
		* plus a `Menu` of the choices it offers.
		*/
		/**
		* Render one labelled dropdown.
		* @param props - the field label, current value, choices, and write callback.
		* @returns the trigger and its menu.
		*/
		function FieldPicker(props) {
			const [open, setOpen] = (0, react.useState)(false);
			const current = props.options.find((option) => option.id === props.value) ?? props.options[0];
			const items = props.options.map((option) => ({
				id: option.id,
				label: option.label
			}));
			return (0, react_jsx_runtime.jsxs)("div", {
				className: TeamPresetsSection_module_css_default.field,
				children: [(0, react_jsx_runtime.jsx)("span", {
					className: TeamPresetsSection_module_css_default.fieldLabel,
					children: props.label
				}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
					open,
					items,
					selectedId: props.value,
					onSelect: (id) => {
						setOpen(false);
						props.onChange(id);
					},
					onClose: () => {
						setOpen(false);
					},
					portal: true,
					anchor: (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: TeamPresetsSection_module_css_default.select,
						disabled: props.disabled,
						"aria-haspopup": "listbox",
						"aria-expanded": open,
						onClick: () => {
							setOpen((value) => !value);
						},
						children: [(0, react_jsx_runtime.jsx)("span", {
							className: TeamPresetsSection_module_css_default.selectLabel,
							children: current?.label ?? ""
						}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutlineRegular, { size: 14 })]
					})
				})]
			});
		}


		/**
		* Third Team preset page: one captain or member, split into identity, model,
		* tools, and system prompt cards so a narrow Settings panel never crowds.
		*/
		/** Colors offered for one agent's accent mark. */
		const NO_COLOR = "";
		/**
		* Whether one edited slot owns a route.
		* @param agent - the captain or member being edited.
		* @returns whether the slot stores its own provider, model, and reasoning effort.
		*/
		function hasMemberRoute(agent) {
			return "provider" in agent;
		}
		/**
		* Render one agent's page.
		* @param props - the agent, its role, the catalogue, copy, and write callbacks.
		* @returns the back row and the four setting cards.
		*/
		function TeamAgentView(props) {
			const { agent, t, disabled } = props;
			const toolsReady = props.toolCatalogue === "ready";
			const mode = toolMode(agent);
			const customTools = mode === "custom";
			const unavailable = toolsReady ? agent.tools.filter((name) => !props.tools.some((tool) => tool.name === name)) : [];
			const toolChoices = props.tools.length === 0 ? agent.tools.map((name) => ({
				name,
				description: "",
				source: "other"
			})) : props.tools;
			const toolGroups = (() => {
				const ours = toolChoices.filter((tool) => tool.source === "presets");
				const byServer = /* @__PURE__ */ new Map();
				const other = [];
				for (const tool of toolChoices) {
					if (tool.source === "presets") continue;
					if (tool.source === "mcp" && tool.server !== void 0) {
						byServer.set(tool.server, [...byServer.get(tool.server) ?? [], tool]);
						continue;
					}
					other.push(tool);
				}
				const groups = [];
				if (ours.length > 0) groups.push({
					key: "presets",
					label: t("toolsGroupPresets"),
					tools: ours
				});
				for (const [server, tools] of [...byServer.entries()].sort(([left], [right]) => left.localeCompare(right))) groups.push({
					key: `mcp:${server}`,
					label: `${t("toolsGroupMcp")}: ${server}`,
					tools
				});
				if (other.length > 0) groups.push({
					key: "other",
					label: t("toolsGroupOther"),
					tools: other
				});
				return groups;
			})();
			const [expandedGroups, setExpandedGroups] = (0, react.useState)([]);
			/** Whether this page may grant the tool at all; a member cannot grant captain-only. */
			const grantable = (tool) => !(props.role === "member" && tool.captainOnly === true);
			const modeOptions = [{
				id: "all",
				label: t("toolsDefault")
			}, {
				id: "custom",
				label: t("toolsCustom")
			}];
			const route = props.role === "member" && hasMemberRoute(agent) ? agent : void 0;
			const models = (route === void 0 ? void 0 : props.providers.find((entry) => entry.id === route.provider))?.models ?? [];
			const model = route === void 0 ? void 0 : models.find((entry) => entry.id === route.model);
			const providerOptions = [{
				id: "",
				label: t("routeInherit")
			}, ...props.providers.map((entry) => ({
				id: entry.id,
				label: entry.name
			}))];
			const modelOptions = [{
				id: "",
				label: t("routeInherit")
			}, ...models.map((entry) => ({
				id: entry.id,
				label: entry.name
			}))];
			const effortOptions = [{
				id: "",
				label: t("effortDefault")
			}, ...(model?.efforts ?? []).map((effort) => ({
				id: effort.id,
				label: effort.name
			}))];
			return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				(0, react_jsx_runtime.jsxs)("header", {
					className: TeamPresetsSection_module_css_default.pageHead,
					children: [(0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: TeamPresetsSection_module_css_default.crumb,
						onClick: props.onBack,
						children: [
							(0, react_jsx_runtime.jsx)("span", {
								"aria-hidden": true,
								children: "‹"
							}),
							" ",
							props.teamName === "" ? t("back") : props.teamName
						]
					}), (0, react_jsx_runtime.jsxs)("h2", {
						className: TeamPresetsSection_module_css_default.title,
						children: [props.role === "captain" ? t("roleCaptain") : t("roleMember"), agent.name.trim() === "" ? "" : ` · ${agent.name.trim()}`]
					})]
				}),
				props.role === "captain" ? (0, react_jsx_runtime.jsx)("p", {
					className: TeamPresetsSection_module_css_default.intro,
					children: t("captainHint")
				}) : null,
				(0, react_jsx_runtime.jsxs)("section", {
					className: TeamPresetsSection_module_css_default.card,
					children: [
						(0, react_jsx_runtime.jsx)("span", {
							className: TeamPresetsSection_module_css_default.cardTitle,
							children: t("identitySection")
						}),
						(0, react_jsx_runtime.jsxs)("div", {
							className: TeamPresetsSection_module_css_default.field,
							children: [(0, react_jsx_runtime.jsx)("span", {
								className: TeamPresetsSection_module_css_default.fieldLabel,
								children: t("agentName")
							}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								className: TeamPresetsSection_module_css_default.input ?? "",
								value: agent.name,
								placeholder: t("agentNamePlaceholder"),
								disabled,
								onChange: (event) => {
									props.onChange({ name: event.target.value });
								}
							})]
						}),
						(0, react_jsx_runtime.jsxs)("div", {
							className: TeamPresetsSection_module_css_default.field,
							children: [(0, react_jsx_runtime.jsx)("span", {
								className: TeamPresetsSection_module_css_default.fieldLabel,
								children: t("agentColor")
							}), (0, react_jsx_runtime.jsxs)("span", {
								className: TeamPresetsSection_module_css_default.swatches,
								children: [(0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: TeamPresetsSection_module_css_default.swatchNone,
									"aria-label": t("effortDefault"),
									"aria-pressed": agent.color === NO_COLOR,
									disabled,
									onClick: () => {
										props.onChange({ color: NO_COLOR });
									}
								}), AGENT_COLORS.map((color) => (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: TeamPresetsSection_module_css_default.swatch,
									style: { background: color },
									"aria-label": color,
									"aria-pressed": agent.color === color,
									disabled,
									onClick: () => {
										props.onChange({ color });
									}
								}, color))]
							})]
						}),
						(0, react_jsx_runtime.jsxs)("div", {
							className: TeamPresetsSection_module_css_default.field,
							children: [(0, react_jsx_runtime.jsx)("span", {
								className: TeamPresetsSection_module_css_default.fieldLabel,
								children: t("agentDescription")
							}), (0, react_jsx_runtime.jsx)("textarea", {
								className: TeamPresetsSection_module_css_default.prompt,
								rows: 3,
								value: agent.description,
								disabled,
								onChange: (event) => {
									props.onChange({ description: event.target.value });
								}
							})]
						})
					]
				}),
				(0, react_jsx_runtime.jsxs)("section", {
					className: TeamPresetsSection_module_css_default.card,
					children: [
						(0, react_jsx_runtime.jsx)("span", {
							className: TeamPresetsSection_module_css_default.cardTitle,
							children: t("modelSection")
						}),
						route === void 0 ? (0, react_jsx_runtime.jsx)("span", {
							className: TeamPresetsSection_module_css_default.hint,
							children: t("captainModelHint")
						}) : (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							(0, react_jsx_runtime.jsx)(FieldPicker, {
								label: t("provider"),
								value: route.provider,
								options: providerOptions,
								disabled,
								onChange: (id) => {
									props.onChange({
										provider: id,
										model: id === "" ? "" : route.model,
										reasoningEffort: ""
									});
								}
							}),
							(0, react_jsx_runtime.jsx)(FieldPicker, {
								label: t("model"),
								value: route.model,
								options: modelOptions,
								disabled: disabled || route.provider === "",
								onChange: (id) => {
									props.onChange({
										model: id,
										reasoningEffort: ""
									});
								}
							}),
							(0, react_jsx_runtime.jsx)(FieldPicker, {
								label: t("effort"),
								value: route.reasoningEffort,
								options: effortOptions,
								disabled: disabled || route.model === "",
								onChange: (id) => {
									props.onChange({ reasoningEffort: id });
								}
							})
						] }),
						props.catalogueFailed ? (0, react_jsx_runtime.jsx)("span", {
							className: TeamPresetsSection_module_css_default.warn,
							role: "status",
							children: t("modelsFailed")
						}) : null,
						props.cataloguePartial ? (0, react_jsx_runtime.jsx)("span", {
							className: TeamPresetsSection_module_css_default.warn,
							role: "status",
							children: t("modelsPartial")
						}) : null
					]
				}),
				(0, react_jsx_runtime.jsxs)("section", {
					className: TeamPresetsSection_module_css_default.card,
					children: [
						(0, react_jsx_runtime.jsx)("span", {
							className: TeamPresetsSection_module_css_default.cardTitle,
							children: t("toolsSection")
						}),
						(0, react_jsx_runtime.jsx)(FieldPicker, {
							label: t("toolMode"),
							value: mode,
							options: modeOptions,
							disabled,
							onChange: (id) => {
								props.onChange({ toolMode: id === "custom" ? "custom" : "all" });
							}
						}),
						customTools ? (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							(0, react_jsx_runtime.jsxs)("div", {
								className: TeamPresetsSection_module_css_default.cardHead,
								children: [(0, react_jsx_runtime.jsx)("span", {
									className: TeamPresetsSection_module_css_default.fieldLabel,
									children: t("tools")
								}), (0, react_jsx_runtime.jsxs)("span", {
									className: TeamPresetsSection_module_css_default.rowActions,
									children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										size: "sm",
										variant: "ghost",
										disabled: disabled || !toolsReady || props.tools.length === 0,
										onClick: () => {
											props.onChange({ tools: props.tools.filter((tool) => !(props.role === "member" && tool.captainOnly === true)).map((tool) => tool.name) });
										},
										children: t("toolsSelectAll")
									}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										size: "sm",
										variant: "ghost",
										disabled: disabled || agent.tools.length === 0,
										onClick: () => {
											props.onChange({ tools: [] });
										},
										children: t("toolsClear")
									})]
								})]
							}),
							toolGroups.map((group) => {
								const expanded = expandedGroups.includes(group.key);
								const grantableTools = group.tools.filter(grantable);
								const chosen = group.tools.filter((tool) => agent.tools.includes(tool.name)).length;
								const inside = new Set(group.tools.map((tool) => tool.name));
								const outside = agent.tools.filter((name) => !inside.has(name));
								const retained = group.tools.filter((tool) => agent.tools.includes(tool.name) && !grantable(tool)).map((tool) => tool.name);
								return (0, react_jsx_runtime.jsxs)("div", {
									className: TeamPresetsSection_module_css_default.toolGroup,
									children: [(0, react_jsx_runtime.jsxs)("div", {
										className: TeamPresetsSection_module_css_default.toolGroupHead,
										children: [(0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											className: TeamPresetsSection_module_css_default.toolGroupToggle,
											"aria-expanded": expanded,
											onClick: () => {
												setExpandedGroups((current) => current.includes(group.key) ? current.filter((entry) => entry !== group.key) : [...current, group.key]);
											},
											children: [
												(0, react_jsx_runtime.jsx)("span", {
													"aria-hidden": "true",
													children: expanded ? "▾" : "▸"
												}),
												(0, react_jsx_runtime.jsx)("span", {
													className: TeamPresetsSection_module_css_default.fieldLabel,
													children: group.label
												}),
												(0, react_jsx_runtime.jsx)("span", {
													className: TeamPresetsSection_module_css_default.toolGroupCount,
													children: `${String(chosen)}/${String(group.tools.length)}`
												})
											]
										}), (0, react_jsx_runtime.jsxs)("span", {
											className: TeamPresetsSection_module_css_default.rowActions,
											children: [
												(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
													size: "sm",
													variant: "ghost",
													disabled: disabled || !toolsReady,
													onClick: () => {
														props.onChange({ tools: [
															...outside,
															...grantableTools.map((tool) => tool.name),
															...retained
														] });
													},
													children: t("toolsSelectAll")
												}),
												(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
													size: "sm",
													variant: "ghost",
													disabled: disabled || !toolsReady,
													onClick: () => {
														const flipped = grantableTools.filter((tool) => !agent.tools.includes(tool.name)).map((tool) => tool.name);
														props.onChange({ tools: [
															...outside,
															...flipped,
															...retained
														] });
													},
													children: t("toolsInvert")
												}),
												(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
													size: "sm",
													variant: "ghost",
													disabled: disabled || chosen === 0,
													onClick: () => {
														props.onChange({ tools: [...outside] });
													},
													children: t("toolsClear")
												})
											]
										})]
									}), expanded ? (0, react_jsx_runtime.jsx)("div", {
										className: TeamPresetsSection_module_css_default.toolGrid,
										role: "group",
										"aria-label": group.label,
										children: group.tools.map((tool) => {
											const restricted = !grantable(tool);
											const selected = agent.tools.includes(tool.name);
											return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Checkbox, {
												className: TeamPresetsSection_module_css_default.toolCheckbox,
												label: tool.name,
												title: restricted ? `${tool.description} ${t("toolsCaptainOnly")}` : tool.description,
												checked: selected,
												disabled: disabled || restricted && !selected || !toolsReady && !selected,
												onChange: (checked) => {
													props.onChange({ tools: checked ? [...agent.tools, tool.name] : agent.tools.filter((name) => name !== tool.name) });
												}
											}, tool.name);
										})
									}) : null]
								}, group.key);
							}),
							props.toolCatalogue === "loading" || props.toolCatalogue === "idle" ? (0, react_jsx_runtime.jsx)("span", {
								className: TeamPresetsSection_module_css_default.hint,
								role: "status",
								children: t("toolsLoading")
							}) : props.toolCatalogue === "error" ? (0, react_jsx_runtime.jsx)("span", {
								className: TeamPresetsSection_module_css_default.warn,
								role: "status",
								children: t("toolsFailed")
							}) : props.tools.length === 0 ? (0, react_jsx_runtime.jsx)("span", {
								className: TeamPresetsSection_module_css_default.hint,
								children: t("toolsNoCatalog")
							}) : null,
							(0, react_jsx_runtime.jsx)("span", {
								className: agent.tools.length === 0 ? TeamPresetsSection_module_css_default.warn : TeamPresetsSection_module_css_default.hint,
								children: agent.tools.length === 0 ? t("toolsEmpty") : t("toolsHint")
							}),
							unavailable.length === 0 ? null : (0, react_jsx_runtime.jsxs)("div", {
								className: TeamPresetsSection_module_css_default.field,
								children: [(0, react_jsx_runtime.jsx)("span", {
									className: TeamPresetsSection_module_css_default.warn,
									children: t("toolsUnavailable")
								}), (0, react_jsx_runtime.jsx)("ul", {
									className: TeamPresetsSection_module_css_default.plainRows,
									children: unavailable.map((name) => (0, react_jsx_runtime.jsxs)("li", {
										className: TeamPresetsSection_module_css_default.entry,
										children: [(0, react_jsx_runtime.jsx)("span", {
											className: TeamPresetsSection_module_css_default.rowName,
											children: name
										}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											size: "sm",
											variant: "ghost",
											disabled,
											onClick: () => {
												props.onChange({ tools: agent.tools.filter((entry) => entry !== name) });
											},
											children: t("toolsRemove")
										})]
									}, name))
								})]
							})
						] }) : (0, react_jsx_runtime.jsx)("span", {
							className: TeamPresetsSection_module_css_default.hint,
							children: t("toolsAllHint")
						}),
						(0, react_jsx_runtime.jsx)("span", {
							className: TeamPresetsSection_module_css_default.hint,
							children: t("toolsScoped")
						})
					]
				}),
				(0, react_jsx_runtime.jsxs)("section", {
					className: TeamPresetsSection_module_css_default.card,
					children: [(0, react_jsx_runtime.jsx)("span", {
						className: TeamPresetsSection_module_css_default.cardTitle,
						children: t("promptSection")
					}), (0, react_jsx_runtime.jsxs)("div", {
						className: TeamPresetsSection_module_css_default.field,
						children: [(0, react_jsx_runtime.jsx)("textarea", {
							className: TeamPresetsSection_module_css_default.prompt,
							rows: 8,
							value: agent.systemPrompt,
							placeholder: t("systemPromptPlaceholder"),
							disabled,
							onChange: (event) => {
								props.onChange({ systemPrompt: event.target.value });
							}
						}), (0, react_jsx_runtime.jsx)("span", {
							className: agent.systemPrompt.includes("{{") ? TeamPresetsSection_module_css_default.warn : TeamPresetsSection_module_css_default.hint,
							children: agent.systemPrompt.includes("{{") ? t("promptWarnBraces") : t("systemPromptHint")
						})]
					})]
				}),
				props.onDelete === void 0 ? null : (0, react_jsx_runtime.jsx)("div", {
					className: TeamPresetsSection_module_css_default.actionRow,
					children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						size: "sm",
						variant: "ghost",
						disabled,
						onClick: props.onDelete,
						children: t("deleteAgent")
					})
				})
			] });
		}


		/**
		* Second Team preset page: one Team's own name, description, captain, and
		* member roster. Choosing the captain or a member opens that agent's page.
		*/
		/** Model caption of one configured agent slot. */
		function agentRoute(agent, providers) {
			if (agent.provider === "" || agent.model === "") return "";
			const provider = providers.find((entry) => entry.id === agent.provider);
			const model = provider?.models.find((entry) => entry.id === agent.model);
			return `${provider?.name ?? agent.provider} · ${model?.name ?? agent.model}`;
		}
		/**
		* Render one Team's page.
		* @param props - the Team, catalogue, copy, and navigation callbacks.
		* @returns the back row, the Team identity fields, and the roster.
		*/
		function TeamEditorView(props) {
			const { team, t, disabled } = props;
			return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				(0, react_jsx_runtime.jsxs)("header", {
					className: TeamPresetsSection_module_css_default.pageHead,
					children: [(0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: TeamPresetsSection_module_css_default.crumb,
						onClick: props.onBack,
						children: [
							(0, react_jsx_runtime.jsx)("span", {
								"aria-hidden": true,
								children: "‹"
							}),
							" ",
							t("backToList")
						]
					}), (0, react_jsx_runtime.jsx)("h2", {
						className: TeamPresetsSection_module_css_default.title,
						children: team.name === "" ? team.id : team.name
					})]
				}),
				(0, react_jsx_runtime.jsxs)("section", {
					className: TeamPresetsSection_module_css_default.card,
					children: [(0, react_jsx_runtime.jsxs)("div", {
						className: TeamPresetsSection_module_css_default.field,
						children: [(0, react_jsx_runtime.jsx)("span", {
							className: TeamPresetsSection_module_css_default.fieldLabel,
							children: t("teamName")
						}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
							className: TeamPresetsSection_module_css_default.input ?? "",
							value: team.name,
							placeholder: t("teamNamePlaceholder"),
							disabled,
							onChange: (event) => {
								props.onPatch({ name: event.target.value });
							}
						})]
					}), (0, react_jsx_runtime.jsxs)("div", {
						className: TeamPresetsSection_module_css_default.field,
						children: [(0, react_jsx_runtime.jsx)("span", {
							className: TeamPresetsSection_module_css_default.fieldLabel,
							children: t("teamDescription")
						}), (0, react_jsx_runtime.jsx)("textarea", {
							className: TeamPresetsSection_module_css_default.prompt,
							rows: 3,
							value: team.description,
							disabled,
							onChange: (event) => {
								props.onPatch({ description: event.target.value });
							}
						})]
					})]
				}),
				(0, react_jsx_runtime.jsx)("span", {
					className: TeamPresetsSection_module_css_default.sectionTitle,
					children: t("teamSections")
				}),
				(0, react_jsx_runtime.jsxs)("section", {
					className: TeamPresetsSection_module_css_default.card,
					children: [(0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: TeamPresetsSection_module_css_default.entryRow,
						onClick: () => {
							props.onOpenAgent("captain");
						},
						children: [
							(0, react_jsx_runtime.jsx)("span", {
								className: TeamPresetsSection_module_css_default.dot,
								style: team.captain.color === "" ? void 0 : { background: team.captain.color },
								"aria-hidden": true
							}),
							(0, react_jsx_runtime.jsxs)("span", {
								className: TeamPresetsSection_module_css_default.rowText,
								children: [(0, react_jsx_runtime.jsxs)("span", {
									className: TeamPresetsSection_module_css_default.rowName,
									children: [t("roleCaptain"), team.captain.name.trim() === "" ? "" : ` · ${team.captain.name.trim()}`]
								}), (0, react_jsx_runtime.jsx)("span", {
									className: TeamPresetsSection_module_css_default.rowMeta,
									children: t("captainFollowsSession")
								})]
							}),
							(0, react_jsx_runtime.jsx)("span", {
								className: TeamPresetsSection_module_css_default.chevron,
								"aria-hidden": true,
								children: "›"
							})
						]
					}), (0, react_jsx_runtime.jsx)("p", {
						className: TeamPresetsSection_module_css_default.hint,
						children: t("captainHint")
					})]
				}),
				(0, react_jsx_runtime.jsxs)("section", {
					className: TeamPresetsSection_module_css_default.card,
					children: [(0, react_jsx_runtime.jsxs)("div", {
						className: TeamPresetsSection_module_css_default.cardHead,
						children: [(0, react_jsx_runtime.jsx)("span", {
							className: TeamPresetsSection_module_css_default.cardTitle,
							children: t("members")
						}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							size: "sm",
							variant: "outline",
							disabled,
							onClick: props.onAddMember,
							children: t("addMember")
						})]
					}), team.members.length === 0 ? (0, react_jsx_runtime.jsx)("p", {
						className: TeamPresetsSection_module_css_default.hint,
						children: t("emptyMembers")
					}) : (0, react_jsx_runtime.jsx)("ul", {
						className: TeamPresetsSection_module_css_default.plainRows,
						children: team.members.map((member, index) => (0, react_jsx_runtime.jsxs)("li", {
							className: TeamPresetsSection_module_css_default.entry,
							children: [(0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: TeamPresetsSection_module_css_default.entryRow,
								onClick: () => {
									props.onOpenAgent(index);
								},
								children: [
									(0, react_jsx_runtime.jsx)("span", {
										className: TeamPresetsSection_module_css_default.dot,
										style: member.color === "" ? void 0 : { background: member.color },
										"aria-hidden": true
									}),
									(0, react_jsx_runtime.jsxs)("span", {
										className: TeamPresetsSection_module_css_default.rowText,
										children: [(0, react_jsx_runtime.jsx)("span", {
											className: TeamPresetsSection_module_css_default.rowName,
											children: member.name.trim() === "" ? `${t("roleMember")} ${String(index + 1)}` : member.name.trim()
										}), (0, react_jsx_runtime.jsx)("span", {
											className: TeamPresetsSection_module_css_default.rowMeta,
											children: agentRoute(member, props.providers) || t("inheritSession")
										})]
									}),
									(0, react_jsx_runtime.jsx)("span", {
										className: TeamPresetsSection_module_css_default.chevron,
										"aria-hidden": true,
										children: "›"
									})
								]
							}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "ghost",
								disabled,
								onClick: () => {
									props.onRemoveMember(index);
								},
								children: t("removeMember")
							})]
						}, member.id ?? `${team.id}-member-${String(index)}`))
					})]
				})
			] });
		}


		/**
		* Conflict dialog for one Team import.
		*
		* The document's Team name, captain name, and member names are the keys an
		* import matches on, so each one that the target Team already uses is resolved
		* here: overwrite the configured agent, or add the imported one under a name
		* that is still free. Choosing a new Team name makes the whole document a new
		* Team, which is why the agent collisions disappear with that choice.
		*/
		/**
		* Render one pair of collision choices.
		* @param name - radio group name, unique across the dialog.
		* @param value - the current choice.
		* @param onChange - receives the picked choice.
		* @param labels - the two localized option labels.
		* @param autofocus - whether this group's first option takes initial focus.
		* @returns the two radio options.
		*/
		function choices(name, value, onChange, labels, autofocus = false) {
			return (0, react_jsx_runtime.jsxs)("span", {
				className: TeamPresetsSection_module_css_default.choiceRow,
				children: [(0, react_jsx_runtime.jsxs)("label", {
					className: TeamPresetsSection_module_css_default.choice,
					children: [(0, react_jsx_runtime.jsx)("input", {
						type: "radio",
						name,
						checked: value === "replace",
						...autofocus ? { "data-modal-autofocus": true } : {},
						onChange: () => {
							onChange("replace");
						}
					}), (0, react_jsx_runtime.jsx)("span", { children: labels.replace })]
				}), (0, react_jsx_runtime.jsxs)("label", {
					className: TeamPresetsSection_module_css_default.choice,
					children: [(0, react_jsx_runtime.jsx)("input", {
						type: "radio",
						name,
						checked: value === "rename",
						onChange: () => {
							onChange("rename");
						}
					}), (0, react_jsx_runtime.jsx)("span", { children: labels.rename })]
				})]
			});
		}
		/**
		* Render the collision dialog for one import.
		* @param props - the plan, the page copy, and the two outcomes.
		* @returns the dialog; the caller mounts it only while an import is pending.
		*/
		function TeamImportDialog(props) {
			const { plan, t } = props;
			const [teamChoice, setTeamChoice] = (0, react.useState)("replace");
			const [teamName, setTeamName] = (0, react.useState)(plan.suggestedTeamName);
			const [captainChoice, setCaptainChoice] = (0, react.useState)("replace");
			const [memberChoices, setMemberChoices] = (0, react.useState)({});
			const memberChoice = (name) => memberChoices[name] ?? "replace";
			const agentCollisions = teamChoice === "replace" && (plan.captainConflict !== "" || plan.memberConflicts.length > 0);
			return (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: true,
				onClose: props.onCancel,
				title: t("importConflictTitle"),
				closeLabel: t("close"),
				footer: (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "outline",
					onClick: props.onCancel,
					children: t("cancel")
				}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "primary",
					onClick: () => {
						props.onConfirm({
							team: teamChoice,
							teamName,
							captain: captainChoice,
							members: Object.fromEntries(plan.memberConflicts.map((name) => [name, memberChoice(name)]))
						});
					},
					children: t("importConfirm")
				})] }),
				children: [(0, react_jsx_runtime.jsxs)("section", {
					className: TeamPresetsSection_module_css_default.conflict,
					children: [
						(0, react_jsx_runtime.jsx)("span", {
							className: TeamPresetsSection_module_css_default.conflictLead,
							children: t("importTeamConflict")
						}),
						(0, react_jsx_runtime.jsx)("span", {
							className: TeamPresetsSection_module_css_default.conflictName,
							children: plan.targetName
						}),
						choices("import-team", teamChoice, setTeamChoice, {
							replace: t("importTeamReplace"),
							rename: t("importTeamRename")
						}, true),
						teamChoice === "rename" ? (0, react_jsx_runtime.jsxs)("div", {
							className: TeamPresetsSection_module_css_default.field,
							children: [(0, react_jsx_runtime.jsx)("span", {
								className: TeamPresetsSection_module_css_default.fieldLabel,
								children: t("importNewTeamName")
							}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								className: TeamPresetsSection_module_css_default.input ?? "",
								value: teamName,
								onChange: (event) => {
									setTeamName(event.target.value);
								}
							})]
						}) : null
					]
				}), !agentCollisions ? null : (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [plan.captainConflict === "" ? null : (0, react_jsx_runtime.jsxs)("section", {
					className: TeamPresetsSection_module_css_default.conflict,
					children: [
						(0, react_jsx_runtime.jsx)("span", {
							className: TeamPresetsSection_module_css_default.conflictLead,
							children: t("importCaptainConflict")
						}),
						(0, react_jsx_runtime.jsx)("span", {
							className: TeamPresetsSection_module_css_default.conflictName,
							children: plan.captainConflict
						}),
						choices("import-captain", captainChoice, setCaptainChoice, {
							replace: t("importCaptainReplace"),
							rename: t("importCaptainRename")
						})
					]
				}), plan.memberConflicts.length === 0 ? null : (0, react_jsx_runtime.jsxs)("section", {
					className: TeamPresetsSection_module_css_default.conflict,
					children: [(0, react_jsx_runtime.jsx)("span", {
						className: TeamPresetsSection_module_css_default.conflictLead,
						children: t("importMemberConflict")
					}), (0, react_jsx_runtime.jsx)("ul", {
						className: TeamPresetsSection_module_css_default.plainRows,
						children: plan.memberConflicts.map((name) => (0, react_jsx_runtime.jsxs)("li", {
							className: TeamPresetsSection_module_css_default.conflictMember,
							children: [(0, react_jsx_runtime.jsx)("span", {
								className: TeamPresetsSection_module_css_default.conflictName,
								children: name
							}), choices(`import-member-${name}`, memberChoice(name), (next) => {
								setMemberChoices((current) => ({
									...current,
									[name]: next
								}));
							}, {
								replace: t("importMemberReplace"),
								rename: t("importMemberRename")
							})]
						}, name))
					})]
				})] })]
			});
		}


		/**
		* First Team preset page: every configured Team as one row. Choosing a row
		* opens that Team's own page.
		*/
		/**
		* Render the Team list.
		* @param props - the Teams, copy, and navigation callbacks.
		* @returns the header, the create and import actions, and one row per Team.
		*/
		function TeamListView(props) {
			const { t, disabled } = props;
			const fileInput = (0, react.useRef)(null);
			return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				(0, react_jsx_runtime.jsxs)("header", {
					className: TeamPresetsSection_module_css_default.pageHead,
					children: [(0, react_jsx_runtime.jsx)("h2", {
						className: TeamPresetsSection_module_css_default.title,
						children: t("title")
					}), (0, react_jsx_runtime.jsx)("p", {
						className: TeamPresetsSection_module_css_default.intro,
						children: t("description")
					})]
				}),
				(0, react_jsx_runtime.jsxs)("div", {
					className: TeamPresetsSection_module_css_default.actionRow,
					children: [
						(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							size: "sm",
							variant: "outline",
							disabled,
							onClick: props.onCreate,
							children: t("newTeam")
						}),
						(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							size: "sm",
							variant: "outline",
							disabled,
							onClick: () => {
								fileInput.current?.click();
							},
							children: t("importPreset")
						}),
						(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							size: "sm",
							variant: "outline",
							disabled,
							onClick: props.onRestoreDefaults,
							children: t("restoreDefaults")
						}),
						(0, react_jsx_runtime.jsx)("input", {
							ref: fileInput,
							className: TeamPresetsSection_module_css_default.fileInput,
							type: "file",
							accept: "application/json,.json",
							disabled,
							onChange: (event) => {
								const file = event.target.files?.[0];
								event.target.value = "";
								if (file !== void 0) props.onImport(file);
							}
						})
					]
				}),
				(0, react_jsx_runtime.jsx)("p", {
					className: TeamPresetsSection_module_css_default.hint,
					children: t("importNote")
				}),
				(0, react_jsx_runtime.jsx)("p", {
					className: TeamPresetsSection_module_css_default.hint,
					children: t("restoreDefaultsHint")
				}),
				props.importError === void 0 ? null : (0, react_jsx_runtime.jsx)("p", {
					className: TeamPresetsSection_module_css_default.warn,
					role: "status",
					children: t(props.importError)
				}),
				props.teams.length === 0 ? (0, react_jsx_runtime.jsx)("p", {
					className: TeamPresetsSection_module_css_default.empty,
					children: t("emptyTeams")
				}) : (0, react_jsx_runtime.jsx)("ul", {
					className: TeamPresetsSection_module_css_default.rows,
					children: props.teams.map((team) => (0, react_jsx_runtime.jsxs)("li", {
						className: TeamPresetsSection_module_css_default.card,
						children: [(0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: TeamPresetsSection_module_css_default.rowMain,
							onClick: () => {
								props.onOpen(team.id);
							},
							children: [(0, react_jsx_runtime.jsx)("span", {
								className: TeamPresetsSection_module_css_default.dot,
								style: team.captain.color === "" ? void 0 : { background: team.captain.color },
								"aria-hidden": true
							}), (0, react_jsx_runtime.jsxs)("span", {
								className: TeamPresetsSection_module_css_default.rowText,
								children: [(0, react_jsx_runtime.jsx)("span", {
									className: TeamPresetsSection_module_css_default.rowName,
									children: team.name === "" ? team.id : team.name
								}), (0, react_jsx_runtime.jsx)("span", {
									className: TeamPresetsSection_module_css_default.rowMeta,
									children: `${String(team.members.length)} ${t("memberCount")} · ${t("captainFollowsSession")}`
								})]
							})]
						}), (0, react_jsx_runtime.jsxs)("span", {
							className: TeamPresetsSection_module_css_default.rowActions,
							children: [
								(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									size: "sm",
									variant: "ghost",
									onClick: () => {
										props.onExport(team.id);
									},
									children: t("exportPreset")
								}),
								(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									size: "sm",
									variant: "ghost",
									disabled,
									onClick: () => {
										props.onDuplicate(team.id);
									},
									children: t("duplicate")
								}),
								(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									size: "sm",
									variant: "ghost",
									disabled,
									onClick: () => {
										props.onDelete(team.id);
									},
									children: t("remove")
								})
							]
						})]
					}, team.id))
				})
			] });
		}


		/**
		* Browser file plumbing for the fixed Team preset format: read one chosen
		* document, and offer one Team as a download.
		* @module dsh-agent-team-presets/preset-file
		*/
		/** Characters a generated file name may keep. */
		const UNSAFE_NAME = /[^\p{L}\p{N}._-]+/gu;
		/** File name stem length, so one long Team name cannot produce a huge name. */
		const MAX_STEM = 64;
		/**
		* Derive the file name one Team downloads under.
		* @param team - the Team being exported.
		* @returns a `.json` file name built from the Team's name, or from its identity.
		*/
		function presetFileName(team) {
			const label = (team.name.trim() === "" ? team.id : team.name.trim()).replace(UNSAFE_NAME, "-").replace(/^-+|-+$/gu, "").slice(0, MAX_STEM);
			return `${label === "" ? "team" : label}.json`;
		}
		/**
		* Read one chosen document as text.
		* @param file - the file the user picked.
		* @returns the file's text.
		*/
		async function readPresetFile(file) {
			return await file.text();
		}
		/**
		* Offer one Team document as a download.
		* @param fileName - the name the browser saves it under.
		* @param text - the document body.
		*/
		function downloadPresetText(fileName, text) {
			const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
			try {
				const anchor = document.createElement("a");
				anchor.href = url;
				anchor.download = fileName;
				anchor.click();
			} finally {
				URL.revokeObjectURL(url);
			}
		}


		/**
		* The Agent Team presets settings page: three stacked pages — the Team list,
		* one Team's roster, and one captain or member — with a shared save footer.
		*/
		/**
		* Keep the fields a captain owns out of one shared editor patch.
		*
		* The one-agent page reports both slots' edits through the route-bearing member
		* patch, so the captain branch drops the route members it never renders.
		* @param patch - the edit reported by the one-agent page.
		* @returns the same edit restricted to the captain's own fields.
		*/
		function captainPatch(patch) {
			const { name, color, description, toolMode, tools, systemPrompt } = patch;
			return {
				...name === void 0 ? {} : { name },
				...color === void 0 ? {} : { color },
				...description === void 0 ? {} : { description },
				...toolMode === void 0 ? {} : { toolMode },
				...tools === void 0 ? {} : { tools },
				...systemPrompt === void 0 ? {} : { systemPrompt }
			};
		}
		/**
		* Read one coordinated external update as the footer's status sentences.
		*
		* The saved version wins silently, so the line names what the Host rewrote,
		* added, and deleted, and says a staged edit was replaced or dropped only for
		* the Teams where one really was.
		* @param notice - what the coordination adopted, added, and removed.
		* @param t - the page's locale reader.
		* @returns the sentences the footer shows.
		*/
		function externalUpdateText(notice, t) {
			const parts = [];
			if (notice.teams.length > 0) {
				parts.push(notice.teams.length === 1 ? t("externalUpdateOne", { team: notice.teams[0] ?? "" }) : t("externalUpdateMany", {
					count: notice.teams.length,
					teams: notice.teams.join(", ")
				}));
				if (notice.overridden.length > 0) parts.push(notice.overridden.length === 1 ? t("externalUpdateOverriddenOne", { team: notice.overridden[0] ?? "" }) : t("externalUpdateOverriddenMany", {
					count: notice.overridden.length,
					teams: notice.overridden.join(", ")
				}));
			}
			if (notice.added.length > 0) parts.push(notice.added.length === 1 ? t("externalAddedOne", { team: notice.added[0] ?? "" }) : t("externalAddedMany", {
				count: notice.added.length,
				teams: notice.added.join(", ")
			}));
			if (notice.removed.length > 0) {
				parts.push(notice.removed.length === 1 ? t("externalRemovedOne", { team: notice.removed[0] ?? "" }) : t("externalRemovedMany", {
					count: notice.removed.length,
					teams: notice.removed.join(", ")
				}));
				if (notice.removedEdited.length > 0) parts.push(notice.removedEdited.length === 1 ? t("externalRemovedEditedOne", { team: notice.removedEdited[0] ?? "" }) : t("externalRemovedEditedMany", {
					count: notice.removedEdited.length,
					teams: notice.removedEdited.join(", ")
				}));
			}
			return parts.join(" ");
		}
		/**
		* Render the Team preset settings page.
		* @param props - page state, the page's locale reader, and the editing actions.
		* @returns the current page and the shared save footer.
		*/
		function TeamPresetsSection(props) {
			const { t } = props;
			const state = props.useTeamPresets((snapshot) => snapshot);
			const [view, setView] = (0, react.useState)({ kind: "list" });
			const [importError, setImportError] = (0, react.useState)(void 0);
			const [importPlan, setImportPlan] = (0, react.useState)(void 0);
			const [importGeneration, setImportGeneration] = (0, react.useState)(0);
			const { refreshCatalogue } = props;
			(0, react.useEffect)(() => {
				refreshCatalogue();
			}, [refreshCatalogue]);
			if (state.status !== "ready") {
				const issue = state.formIssue === void 0 ? void 0 : t(FORM_ISSUE_KEYS[state.formIssue]);
				return (0, react_jsx_runtime.jsx)("p", {
					className: TeamPresetsSection_module_css_default.empty,
					role: "status",
					children: issue ?? (state.status === "loading" ? t("sectionLoading") : t("unavailable"))
				});
			}
			const disabled = !state.writable || state.formIssue !== void 0;
			const teamList = state.teams;
			const found = view.kind === "list" ? void 0 : teamList.find((entry) => entry.id === view.teamId);
			const active = view.kind === "list" || found !== void 0 ? view : { kind: "list" };
			const team = found;
			const teamIndex = team === void 0 ? -1 : teamList.indexOf(team);
			const openTeam = (teamId) => {
				setView({
					kind: "team",
					teamId
				});
			};
			const openAgent = (teamId, slot) => {
				setView({
					kind: "agent",
					teamId,
					slot
				});
			};
			/**
			* Read one chosen document, then stage it or ask about the names it collides with.
			* @param file - the document the user chose.
			*/
			async function importDocument(file) {
				const inspection = props.inspectImport(await readPresetFile(file));
				if (!inspection.ok) {
					setImportPlan(void 0);
					setImportError(IMPORT_FAILURE_KEYS[inspection.reason]);
					return;
				}
				setImportError(void 0);
				if (inspection.plan.targetIndex === void 0) {
					openTeam(props.applyImport(inspection.plan, defaultImportResolution(inspection.plan)));
					return;
				}
				setImportGeneration((generation) => generation + 1);
				setImportPlan(inspection.plan);
			}
			/**
			* Write one Team out as a shareable document.
			* @param teamId - the Team the user chose to export.
			*/
			function exportDocument(teamId) {
				const index = teamList.findIndex((entry) => entry.id === teamId);
				const team = index < 0 ? void 0 : teamList[index];
				const text = index < 0 ? void 0 : props.exportTeam(index);
				if (team === void 0 || text === void 0) return;
				downloadPresetText(presetFileName(team), text);
			}
			const execution = team === void 0 ? void 0 : executionStateOf(state, team.id);
			const disclosures = team === void 0 || state.execution !== "ready" ? [] : state.executions.find((row) => row.teamId === team.id)?.notes ?? [];
			const unnamedTeams = unnamedTeamsOf(teamList);
			const memberSlot = active.kind === "agent" && active.slot !== "captain" ? active.slot : void 0;
			const agent = team === void 0 || active.kind !== "agent" ? void 0 : active.slot === "captain" ? team.captain : team.members[active.slot];
			return (0, react_jsx_runtime.jsxs)("div", {
				className: TeamPresetsSection_module_css_default.section,
				children: [
					(0, react_jsx_runtime.jsxs)("div", {
						className: TeamPresetsSection_module_css_default.page,
						children: [
							active.kind === "list" && (0, react_jsx_runtime.jsx)(TeamListView, {
								teams: teamList,
								t,
								disabled,
								importError,
								onOpen: openTeam,
								onCreate: () => {
									openTeam(props.createTeam());
								},
								onImport: (file) => {
									importDocument(file);
								},
								onExport: exportDocument,
								onRestoreDefaults: () => {
									props.restoreDefaults();
								},
								onDuplicate: (teamId) => {
									const index = teamList.findIndex((entry) => entry.id === teamId);
									if (index < 0) return;
									const created = props.duplicateTeam(index);
									if (created !== void 0) openTeam(created);
								},
								onDelete: (teamId) => {
									const index = teamList.findIndex((entry) => entry.id === teamId);
									if (index >= 0) props.removeTeam(index);
									setView({ kind: "list" });
								}
							}),
							active.kind === "team" && team !== void 0 && (0, react_jsx_runtime.jsx)(TeamEditorView, {
								team,
								providers: state.providers,
								t,
								disabled,
								onBack: () => {
									setView({ kind: "list" });
								},
								onPatch: (patch) => {
									props.patchTeam(teamIndex, patch);
								},
								onOpenAgent: (slot) => {
									openAgent(team.id, slot);
								},
								onAddMember: () => {
									props.addMember(teamIndex);
									openAgent(team.id, team.members.length);
								},
								onRemoveMember: (index) => {
									props.removeMember(teamIndex, index);
								}
							}),
							active.kind === "agent" && team !== void 0 && agent !== void 0 && (0, react_jsx_runtime.jsx)(TeamAgentView, {
								agent,
								role: active.slot === "captain" ? "captain" : "member",
								teamName: team.name === "" ? team.id : team.name,
								providers: state.providers,
								tools: state.tools,
								toolCatalogue: state.toolCatalogue,
								cataloguePartial: state.cataloguePartial,
								catalogueFailed: state.catalogue === "error",
								t,
								disabled,
								onBack: () => {
									openTeam(team.id);
								},
								onChange: (patch) => {
									if (active.slot === "captain") props.patchCaptain(teamIndex, captainPatch(patch));
									else props.patchMember(teamIndex, active.slot, patch);
								},
								...memberSlot === void 0 ? {} : { onDelete: () => {
									props.removeMember(teamIndex, memberSlot);
									openTeam(team.id);
								} }
							})
						]
					}),
					importPlan === void 0 ? null : (0, react_jsx_runtime.jsx)(TeamImportDialog, {
						plan: importPlan,
						t,
						onCancel: () => {
							setImportPlan(void 0);
						},
						onConfirm: (resolution) => {
							const created = props.applyImport(importPlan, resolution);
							setImportPlan(void 0);
							openTeam(created);
						}
					}, importGeneration),
					(0, react_jsx_runtime.jsxs)("footer", {
						className: TeamPresetsSection_module_css_default.footer,
						children: [(0, react_jsx_runtime.jsxs)("div", {
							className: TeamPresetsSection_module_css_default.footerNotes,
							children: [
								execution === void 0 ? null : (0, react_jsx_runtime.jsxs)("span", {
									className: TeamPresetsSection_module_css_default.footerNote,
									role: "status",
									children: [t(EXECUTION_NOTICE_KEYS[execution]), execution === "busy" ? ` ${t("executionBusyShared")}` : ""]
								}),
								disclosures.map((disclosure) => (0, react_jsx_runtime.jsx)("span", {
									className: TeamPresetsSection_module_css_default.footerNote,
									role: "status",
									children: DISCLOSURE_NOTICE_KEYS[disclosure] === void 0 ? disclosure : t(DISCLOSURE_NOTICE_KEYS[disclosure])
								}, disclosure)),
								state.failed ? (0, react_jsx_runtime.jsx)("span", {
									className: TeamPresetsSection_module_css_default.warn,
									role: "status",
									children: t("saveFailed")
								}) : null,
								state.formIssue === void 0 ? null : (0, react_jsx_runtime.jsx)("span", {
									className: TeamPresetsSection_module_css_default.warn,
									role: "status",
									children: t(FORM_ISSUE_KEYS[state.formIssue])
								}),
								state.selectionFailure === void 0 ? null : (0, react_jsx_runtime.jsx)("span", {
									className: TeamPresetsSection_module_css_default.warn,
									role: "status",
									children: selectionFailureText(state.selectionFailure, t)
								}),
								unnamedTeams.length === 0 ? null : (0, react_jsx_runtime.jsx)("span", {
									className: TeamPresetsSection_module_css_default.warn,
									role: "status",
									children: t("teamNameRequired", { teams: unnamedTeams.map((entry) => entry.id).join(", ") })
								}),
								state.externalUpdate === void 0 ? null : (0, react_jsx_runtime.jsx)("span", {
									className: TeamPresetsSection_module_css_default.warn,
									role: "status",
									children: externalUpdateText(state.externalUpdate, t)
								}),
								state.defaults === void 0 ? null : (0, react_jsx_runtime.jsx)("span", {
									className: TeamPresetsSection_module_css_default.footerNote,
									role: "status",
									children: t(DEFAULTS_NOTICE_KEYS[state.defaults])
								}),
								state.dirty ? (0, react_jsx_runtime.jsx)("span", {
									className: TeamPresetsSection_module_css_default.footerNote,
									children: t("unsaved")
								}) : null
							]
						}), (0, react_jsx_runtime.jsxs)("div", {
							className: TeamPresetsSection_module_css_default.footerActions,
							children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "ghost",
								disabled: !state.dirty || state.saving,
								onClick: () => {
									props.discard();
								},
								children: t("discard")
							}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "primary",
								disabled: !state.dirty || state.saving || disabled || unnamedTeams.length > 0,
								onClick: () => {
									props.save();
								},
								children: state.saving ? t("saving") : t("save")
							})]
						})]
					})
				]
			});
		}


		/**
		* Browser half of the Agent Team presets plugin: the Settings page that
		* configures Teams and the composer control that selects one per Session.
		*/
		/**
		* Required services (cordis fiber inject).
		*
		* `remote.settings` is the namespace the composer's selection write goes
		* through, and the shared describe mirror every settings surface reads is
		* reached through `configForms`. Both are named explicitly because the cordis
		* property proxy resolves a namespaced service RELATIVE to the context that
		* reads it: `ctx.remote.settings` only resolves where the reading fiber (or an
		* ancestor in the same isolate) declares `remote.settings` in its own inject
		* set. A context that reads it without that declaration throws
		* `cannot get property "remote.settings" without inject`, which is exactly the
		* failure mode this plugin's own scope must never reproduce.
		*/
		const inject = [
			"slots",
			"locale",
			"configForms",
			"remote",
			"remote.session",
			"remote.settings"
		];
		/**
		* Host notifications that change which provider routes exist.
		*
		* The Team model pickers read the same Host catalogue as the composer model
		* picker, so a page left open invalidates on the same events: adapters coming
		* and going, a settings commit, and a credential landing or disappearing.
		*/
		const CATALOGUE_INVALIDATIONS = [
			"llm/adapters-updated",
			"settings/document-updated",
			"credentials/record-updated",
			"credentials/reference-updated"
		];
		/**
		* Register the Settings page and the composer control once this plugin's tool
		* catalog Remote is mounted, so both read the deployment's real tool list.
		* @param ctx - the browser plugin context.
		* @returns disposer withdrawing the UI and the Remote contribution.
		*/
		async function apply(ctx) {
			const disposeRemote = await ctx.remote.$mount(TYPERT_REMOTE);
			const ui = ctx.inject([
				"remote.teamPresets",
				"slots",
				"locale",
				"configForms",
				"remote.session",
				"remote.settings"
			], registerUi);
			try {
				await ui;
			} catch (error) {
				await ui.dispose();
				await disposeRemote();
				throw error;
			}
			return async () => {
				await ui.dispose();
				await disposeRemote();
			};
		}
		/**
		* Register the Settings page and the composer control over one shared Team
		* state, so an edit on the page and a selection in the composer cannot
		* disagree about the settings document.
		* @param ctx - the browser plugin context, with the Team Remote mounted.
		*/
		function registerUi(ctx) {
			const t = ctx.locale.bind(NS);
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "agent-team-presets: dictionaries");
			const controller = new TeamPresetsController(ctx);
			ctx.effect(() => () => {
				controller.dispose();
			}, "agent-team-presets: form subscription");
			controller.loadCatalogue();
			for (const event of CATALOGUE_INVALIDATIONS) ctx.effect(() => ctx.remote.$on(event, () => {
				controller.refreshCatalogue();
			}), `agent-team-presets: ${event} invalidations`);
			ctx.effect(() => ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: TEAM_PRESETS_NS,
				order: 25,
				label: () => t("nav"),
				locale: NS,
				inject: () => controller.inject()
			}, TeamPresetsSection)), "agent-team-presets: settings page");
			ctx.inject(["agentTeamAppearance"], (scope) => {
				const registry = scope.agentTeamAppearance;
				scope.effect(() => registry.register((sessionId) => {
					const state = controller.store.getSnapshot();
					return teamAppearance(state.teams, state.selections, sessionId);
				}), "agent-team-presets: roster appearance");
			});
			ctx.effect(() => ctx.slots.inject("conversation.input.left", () => ctx.slots.register({
				name: "conversation.input.left",
				id: "agent-team-presets",
				order: 10,
				locale: NS,
				inject: () => controller.inject()
			}, ComposerTeamSelect)), "agent-team-presets: composer control");
		}

		exports.TEAM_PRESETS_NS = TEAM_PRESETS_NS;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

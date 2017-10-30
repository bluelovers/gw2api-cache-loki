/**
 * Created by user on 2017/10/31/031.
 */

export type vKey = string | number;
export type vValue = null | any;
export type vTick = number;
export type vTickSec = number;
export type vVoid = void | boolean;

export interface IApiCacheSet
{
	0: vKey;
	1: vValue;
	2: vTickSec;
}

export interface IApiCacheGet
{
	[index: string]: vValue;

	[index: number]: vValue;
}

export interface IApiCacheConfig
{
	/**
	 * The prefix for the cache keys. Defaults to gw2api-
	 */
	prefix?: string;
	/**
	 * How often the garbage collection should clean out expired data (in ms). Defaults to 5 * 60 * 1000
	 */
	gcTick?: vTick;

	[key: string]: any;
}

export interface IApiCache
{
	/**
	 * Gets a single value by key. Has to resolve to null if the value does not exist or is expired.
	 *
	 * @param {vKey} key
	 * @returns {Promise<vValue>}
	 */
	get(key: vKey): Promise<vValue>;

	/**
	 * Sets a single value by key.
	 *
	 * @param {vKey} key
	 * @param {vValue} value
	 * @param {vTickSec} expiresInSeconds
	 * @returns {Promise<vVoid>}
	 */
	set(key: vKey, value: vValue, expiresInSeconds: vTickSec): Promise<vVoid>;

	/**
	 * Gets multiple values by keys. Resolves an array. Missing and expired elements have to be set to null.
	 * Has to maintain the order of keys when resolving into values.
	 *
	 * @param {vKey[]} keys
	 * @returns {Promise<IApiCacheGet>}
	 */
	mget (keys: vKey[]): Promise<IApiCacheGet>;

	/**
	 * Sets multiple values.
	 *
	 * @param {IApiCacheSet[]} values
	 * @returns {Promise<vVoid>}
	 */
	mset (values: IApiCacheSet[]): Promise<vVoid>;

	/**
	 * Clears the cache data (only needed for tests).
	 *
	 * @returns {Promise<vVoid>}
	 */
	flush(): Promise<vVoid>;

	config: IApiCacheConfig;
}

export interface IApiCacheModule
{
	new(config: IApiCacheConfig): IApiCache;

	init(config?: IApiCacheConfig): IApiCache;
}

export function staticImplements<T>()
{
	return (constructor: T) => {}
}

@staticImplements<IApiCacheModule>()
export class ApiCache implements IApiCache
{
	private _ = {};
	public config: IApiCacheConfig = {};

	public defaultConfig: IApiCacheConfig = {
		gcTick: 5 * 60 * 1000
	};

	public static init(config: IApiCacheConfig = {})
	{
		return new this(config);
	}

	constructor(config: IApiCacheConfig = {})
	{
		this.config = Object.assign({}, this.defaultConfig, config);
	}

	async get(key: vKey): Promise<vValue>
	{

	}

	async set(key: vKey, value: vValue, expiresInSeconds: vTickSec): Promise<vVoid>
	{

	}

	async mget(keys: vKey[]): Promise<IApiCacheGet>
	{
		let self = this;

		let ps = keys.map((key: vKey) =>
		{
			return self.get(key);
		});

		return await Promise.all(ps);
	}

	async mset(values: IApiCacheSet[]): Promise<vVoid>
	{
		let self = this;

		let ps = values.map((value: IApiCacheSet) =>
		{
			return self.set(value[0], value[1], value[2]);
		});

		await Promise.all(ps);

		return true;
	}

	async flush(): Promise<vVoid>
	{

	}
}

export default ApiCache;

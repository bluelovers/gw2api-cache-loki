/**
 * Created by user on 2017/10/25/025.
 */

import * as ApiCacheDemo from './lib/interface';
import * as LokiJS from 'lokijs';
import LokiFsSyncAdapter from 'loki-fs-sync-adapter';
import * as Promise from 'bluebird';

export type vDate = number;

export interface IApiCacheConfig extends ApiCacheDemo.IApiCacheConfig
{
	loki?: LokiJS;
	file?: string;

	onget?: IApiCacheOnCall;
	onset?: IApiCacheOnCall;
	'onset:data'?: IApiCacheOnCall;
}

export interface IApiCacheOnCall extends Function
{
	(self: ApiCache, argv: IApiCacheOn, data: IApiCacheOn): void | IApiCacheOn;
}

export interface IApiCacheOn
{
	db_col?: LokiJS.Collection;
	db_key?: ApiCacheDemo.vKey;
	db_expiry?: vDate;
	now?: vDate;

	key?: ApiCacheDemo.vKey;
	value?: ApiCacheDemo.vValue;
	expiresInSeconds?: vDate;

	exists?: any;
	d?: any;
}

export interface IColOptions
{
	idx_unique?: string;
	idx?: string[];

	new_col?: boolean;
}

export function get_col(db, cache_col: string, options: IColOptions = {}): LokiJS.Collection
{
	options = Object.assign({
		idx_unique: 'db_key',
		idx: [
			'id'
		],
	}, options) as IColOptions;

	let db_cache = options.new_col ? null : db.getCollection(cache_col);

	if (!db_cache)
	{
		db_cache = db.addCollection(cache_col, { indices: [options.idx_unique].concat(options.idx) });

		db_cache.ensureUniqueIndex(options.idx_unique);
	}

	db_cache.ensureIndex(options.idx_unique);

	return db_cache;
}

export function createDb(config: IApiCacheConfig = {}): IApiCacheConfig
{
	if (config.loki)
	{
		return config.loki;
	}

	config.file = config.file || 'api.cache.loki.db';

	let db = new LokiJS(config.file, {
		adapter: new LokiFsSyncAdapter,
	});

	config.loki = db;

	db.loadDatabase({}, () =>
	{
		console.debug('[db] loadDatabase', config);
	});

	config.cache_col = config.cache_col || 'api.cache';

	return config;
}

@ApiCacheDemo.staticImplements<ApiCacheDemo.IApiCacheModule>()
export class ApiCache extends ApiCacheDemo.ApiCache
{

	public static init(config: IApiCacheConfig = {})
	{
		return new this(config);
	}

	constructor(config: IApiCacheConfig = {})
	{
		super(config);

		createDb(this.config);

		this.config.db_cache = get_col(this.db, this.config.cache_col);
	}

	dbKey(key)
	{
		return (this.config.prefix || '') + key;
	}

	dbCol(cache_col: string, options: IColOptions = {}): LokiJS.Collection
	{
		return get_col(this.db, cache_col, options);
	}

	tinyData(value, removeMeta = false)
	{
		let d = Object.assign({}, value);

		delete d.db_key;
		delete d.db_expiry;
		delete d['$loki'];

		if (removeMeta)
		{
			delete d.meta;
		}

		return d;
	}

	on(method: string, argv: IApiCacheOn = {}, data: IApiCacheOn = {}): IApiCacheOn
	{
		Object.assign(data,
			argv,
			{

				db_key: this.dbKey(argv.key),
				db_col: this.config.db_cache,

			},
			data,
		);

		if (typeof this.config[`on${method}`] == 'function')
		{
			let ret = (this.config[`on${method}`] as IApiCacheOnCall).call(this, this, argv, data);

			if (ret)
			{
				Object.assign(data, ret);
			}
		}

		return data;
	}

	now(): vDate
	{
		return (new Date()).getTime();
	}

	async get(key)
	{
		let data = this.on('get', {
			key: key,
		}, {
			now: this.now(),
		});

		let exists = data.db_col.findOne({
			db_key: data.db_key,
		});

		//console.log('[ApiCache]', 'get', db_key, exists);

		return exists && exists.db_expiry > data.now ? this.tinyData(exists) : null;
	}

	async set(key, value, expiresInSeconds)
	{
		let data = this.on('set', {
			key: key,
			value: value,
			expiresInSeconds: expiresInSeconds,
		}, {
			now: this.now(),
		});

		let exists = data.db_col.findOne({
			db_key: data.db_key,
		});

		let d = Object.assign({
				db_key: data.db_key,
			},
			value,
			exists,
			{
				db_key: data.db_key,
				db_expiry: data.now + data.expiresInSeconds * 1000,
			},
		);

		data = this.on('set:data', {
			d: d,
			exists: exists,
		}, data);

		if (!data.exists)
		{
			data.db_col.insert(data.d);
		}
		else
		{
			data.db_col.update(data.d);
		}

		return true;
	}

	async save(): Promise<ApiCacheDemo.vVoid>
	{
		let self = this;

		return new Promise(function (resolve, reject)
		{
			self.db.saveDatabase((err) =>
			{
				if (err)
				{
					reject(err);
				}
				else
				{
					console.debug('[ApiCache]', 'save');
					resolve(true);
				}
			})
		});
	}

	dbClearExpiry(now?: number | Date)
	{
		let query = {
			'$gt': 0,
		};

		if (!now && now !== 0)
		{
			now = (new Date()).getTime();
		}

		if (now > 0)
		{
			query['$lte'] = now;
		}

		this.config.db_cache.findAndRemove({
			'db_expiry': query,
		});
	}

	async flush()
	{
		let self = this;

		return new Promise(function (resolve, reject)
		{
			self.db.deleteDatabase((err) =>
			{
				if (err)
				{
					reject(err);
				}
				else
				{
					console.log('[ApiCache]', 'flush');
					resolve(true);
				}
			})
		});
	}

	get db(): LokiJS
	{
		return this.config.loki;
	}
}

export default ApiCache;

export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "static/dist/_app",
	assets: new Set(["favicon.svg","map/russia-regions.geojson"]),
	mimeTypes: {".svg":"image/svg+xml",".geojson":"application/geo+json"},
	_: {
		client: {start:"_app/immutable/entry/start.CM64t-i1.js",app:"_app/immutable/entry/app.KW_T9bDj.js",imports:["_app/immutable/entry/start.CM64t-i1.js","_app/immutable/chunks/C7ZP3UbC.js","_app/immutable/chunks/BxtYC-66.js","_app/immutable/chunks/u22IbsLD.js","_app/immutable/entry/app.KW_T9bDj.js","_app/immutable/chunks/BxtYC-66.js","_app/immutable/chunks/HclGiUj8.js","_app/immutable/chunks/xihTtKlq.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

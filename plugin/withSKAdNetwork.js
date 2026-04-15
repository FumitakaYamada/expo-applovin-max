/**
 * Expo Config Plugin to add SKAdNetwork identifiers to Info.plist
 *
 * SKAdNetwork is Apple's privacy-safe way for ad networks to track installs.
 * This plugin adds all necessary SKAdNetworkIdentifier entries for AppLovin MAX
 * and its mediated networks.
 *
 * @see https://support.axon.ai/en/max/react-native/overview/skadnetwork/
 * @see https://developer.apple.com/documentation/storekit/skadnetwork
 */

const { withInfoPlist } = require("expo/config-plugins");

/**
 * SKAdNetwork identifiers for all mediated networks
 *
 * Sources:
 * - AppLovin: https://skadnetwork-ids.applovin.com/v1/skadnetworkids.json
 * - Other networks: AppLovin Info.plist Generator
 *
 * Networks included:
 * - AppLovin
 * - Amazon
 * - BidMachine
 * - DT Exchange (Fyber)
 * - Google AdMob / Google Bidding
 * - InMobi
 * - ironSource
 * - Liftoff Monetize (Vungle)
 * - Meta Audience Network (Facebook)
 * - Mintegral
 * - Pangle (ByteDance)
 * - Unity Ads
 */
const SKADNETWORK_IDENTIFIERS = [
	// === AppLovin ===
	"ludvb6z3bs.skadnetwork",
	"4fzdc2evr5.skadnetwork",
	"mlmmfzh3r3.skadnetwork",
	"24t9a8vw3c.skadnetwork",
	"f7s53z58qe.skadnetwork",
	"mj797d8u6f.skadnetwork",
	"2u9pt9hc89.skadnetwork",
	"8s468mfl3y.skadnetwork",
	"av6w8kgt66.skadnetwork",
	"klf5c3l5u5.skadnetwork",
	"ppxm28t8ap.skadnetwork",
	"424m5254lk.skadnetwork",
	"uw77j35x4d.skadnetwork",
	"578prtvx9j.skadnetwork",
	"4468km3ulz.skadnetwork",
	"e5fvkxwrpn.skadnetwork",
	"zq492l623r.skadnetwork",
	"3rd42ekr43.skadnetwork",
	"3qcr597p9d.skadnetwork",

	// === Amazon ===
	"p78axxw29g.skadnetwork",
	"4dzt52r2t5.skadnetwork",
	"bvpn9ufa9b.skadnetwork",

	// === BidMachine ===
	"wg4vff78zm.skadnetwork",
	"737z793b9f.skadnetwork",
	"ydx93a7ass.skadnetwork",

	// === DT Exchange (Fyber) ===
	"cstr6suwn9.skadnetwork",
	"238da6jt44.skadnetwork",
	"22mmun2rn5.skadnetwork",

	// === Google AdMob / Google Bidding ===
	"cg4yq2srnc.skadnetwork",
	"f38h382jlk.skadnetwork",
	"v72qych5uu.skadnetwork",
	"gta9lk7p23.skadnetwork",
	"32z4fx6l9h.skadnetwork",
	"9rd848q2bz.skadnetwork",
	"n6fk4nfna4.skadnetwork",
	"9nlqeag3gk.skadnetwork",
	"52fl2v3hgk.skadnetwork",

	// === InMobi ===
	"wzmmz9fp6w.skadnetwork",
	"hs6bdukanm.skadnetwork",

	// === ironSource ===
	"su67r6k2v3.skadnetwork",
	"6g9af3uyq4.skadnetwork",
	"4pfyvq9l8r.skadnetwork",
	"tl55sbb4fm.skadnetwork",
	"t38b2kh725.skadnetwork",
	"c6k4g5qg8m.skadnetwork",
	"ggvn48r87g.skadnetwork",
	"s39g8k73mm.skadnetwork",
	"3sh42y64q3.skadnetwork",
	"f73kdq92p3.skadnetwork",
	"w9q455wk68.skadnetwork",

	// === Liftoff Monetize (Vungle) ===
	"gta8lk7p23.skadnetwork",
	"275upjj5gd.skadnetwork",
	"apzhy3va96.skadnetwork",

	// === Meta Audience Network (Facebook) ===
	"v9wttpbfk9.skadnetwork",
	"n38lu8286q.skadnetwork",

	// === Mintegral ===
	"kbd757ywx3.skadnetwork",
	"zmvfpc5aq8.skadnetwork",
	"7ug5zh24hu.skadnetwork",
	"5lm9lj6jb7.skadnetwork",
	"44jx6755aq.skadnetwork",
	"g28c52eehv.skadnetwork",
	"6xzpu9s2p8.skadnetwork",
	"523jb4fst2.skadnetwork",
	"44n7hlldy6.skadnetwork",

	// === Pangle (ByteDance) ===
	"22mmun2rn5.skadnetwork",
	"238da6jt44.skadnetwork",
	"3qy4746246.skadnetwork",
	"3sh42y64q3.skadnetwork",
	"488r3q3dtq.skadnetwork",
	"4pfyvq9l8r.skadnetwork",
	"5a6flpkh64.skadnetwork",
	"bxvub5ada5.skadnetwork",
	"c6k4g5qg8m.skadnetwork",
	"ejvt5qm6ak.skadnetwork",
	"f38h382jlk.skadnetwork",
	"g28c52eehv.skadnetwork",
	"ggvn48r87g.skadnetwork",
	"glqzh8vber.skadnetwork",
	"gvmwg8q7h5.skadnetwork",
	"k674qkevps.skadnetwork",
	"m8dbw4sv7c.skadnetwork",
	"n9x2a789qt.skadnetwork",
	"r26jy69rpl.skadnetwork",
	"rx5hdcabgc.skadnetwork",
	"t38b2kh725.skadnetwork",
	"uw77j35x4d.skadnetwork",
	"v79kvwwj4g.skadnetwork",
	"x44k69ngh6.skadnetwork",
	"xy9t38ct57.skadnetwork",
	"y5ghdn5j9k.skadnetwork",
	"yclnxrl5pm.skadnetwork",

	// === Unity Ads ===
	"4dzt52r2t5.skadnetwork",
	"bvpn9ufa9b.skadnetwork",
	"488r3q3dtq.skadnetwork",
	"prcb7njmu6.skadnetwork",
	"m8dbw4sv7c.skadnetwork",
	"97r2b46745.skadnetwork",
	"6964rsfnh4.skadnetwork",
	"77y3x8wds4.skadnetwork",

	// === Additional common networks ===
	"23zd986j2c.skadnetwork", // Adgoji
	"9t245vhmpl.skadnetwork",
	"a7xqa6mtl2.skadnetwork",
	"a2p9lx4jpn.skadnetwork",
	"b9bk5wbcq9.skadnetwork",
	"cj5566h2ga.skadnetwork",
	"feyaarzu9v.skadnetwork",
	"g2y4y55b64.skadnetwork",
	"k7fxg67fv4.skadnetwork",
	"mp6xlyr22a.skadnetwork",
	"mtkv5xtk9e.skadnetwork",
	"n66cz3y3bx.skadnetwork",
	"nzq8sh4pbs.skadnetwork",
	"p78axxw29g.skadnetwork",
	"pwa73g5rt2.skadnetwork",
	"r45fhb6rf7.skadnetwork",
	"rvh3l7un93.skadnetwork",
	"u679fj5vs4.skadnetwork",
	"v4nxqhlyqp.skadnetwork",
	"vcra2ehyfk.skadnetwork",
	"x8uqf25wch.skadnetwork",
	"xy9t38ct57.skadnetwork",
	"y45688jllp.skadnetwork",
	"yrqqpx2mcb.skadnetwork",
	"z4gj7hsk7h.skadnetwork",
	"252b5q8x7y.skadnetwork",
	"9b89h5y424.skadnetwork",
	"cad8qz2s3j.skadnetwork",
	"dzg6xy7pwj.skadnetwork",
	"hdw39hrw9y.skadnetwork",
	"kbmxgpxpgc.skadnetwork",
	"lr83yxwka7.skadnetwork",
	"mls7yz5dvl.skadnetwork",
	"pwdxu55a5a.skadnetwork",
	"qqp299437r.skadnetwork",
	"v9wttpbfk9.skadnetwork",
	"wg4vff78zm.skadnetwork",
	"x5l83yy675.skadnetwork",
	"294l99pt4k.skadnetwork",
	"5l3tpt7t6e.skadnetwork",
	"6p4ks3rnbw.skadnetwork",
	"79pbpufp6p.skadnetwork",
	"7rz58n8ntl.skadnetwork",
	"89z7zv988g.skadnetwork",
	"8c4e2ghe7u.skadnetwork",
	"8m87ys6875.skadnetwork",
	"8r8llnkz5a.skadnetwork",
	"9g2aggbj52.skadnetwork",
	"9vvzujtq5s.skadnetwork",
	"9yg77x724h.skadnetwork",
	"a8cz6cu7e5.skadnetwork",
	"dbu4b84rxf.skadnetwork",
	"dkc879ngq3.skadnetwork",
	"ecpz2srf59.skadnetwork",
	"eh6m2bh4zr.skadnetwork",
	"f1zi6bnwaq.skadnetwork",
	"gfat3222tu.skadnetwork",
	"hb56zgv37p.skadnetwork",
	"jb7bn6koa5.skadnetwork",
	"krvm3zuq6h.skadnetwork",
	"l6nv3x923s.skadnetwork",
	"l93v5h6a4m.skadnetwork",
	"mqn7fxpca7.skadnetwork",
	"n5fk4nfna4.skadnetwork",
	"nu4557a4je.skadnetwork",
	"pd25vrrwzn.skadnetwork",
	"pu4na253f3.skadnetwork",
	"s69wq72ugq.skadnetwork",
	"u8npv5t5a8.skadnetwork",
	"v7896pgt74.skadnetwork",
	"x2jnk7ly8j.skadnetwork",
	"xs7uc5a9ts.skadnetwork",
	"y2ed4ez56y.skadnetwork",
	"z24wtl6j62.skadnetwork",
	"zh3b7bxvad.skadnetwork",
	"zq4b6w6q63.skadnetwork",

	// === Additional networks (December 2024 update) ===
	"24zw6aqk47.skadnetwork",
	"2fnua5tdw4.skadnetwork",
	"2q884k2j68.skadnetwork",
	"2rq3zucswp.skadnetwork",
	"2tdux39lx8.skadnetwork",
	"33r6p7g8nc.skadnetwork",
	"3cgn6rq224.skadnetwork",
	"3l6bd9hu43.skadnetwork",
	"47vhws6wlr.skadnetwork",
	"4mn522wn87.skadnetwork",
	"4w7y6s5ca2.skadnetwork",
	"54nzkqm89y.skadnetwork",
	"55644vm79v.skadnetwork",
	"55y65gfgn7.skadnetwork",
	"577p5t736z.skadnetwork",
	"5f5u5tfb26.skadnetwork",
	"5ghnmfs3dh.skadnetwork",
	"5mv394q32t.skadnetwork",
	"5tjdwbrq8w.skadnetwork",
	"627r9wr2y5.skadnetwork",
	"633vhxswh4.skadnetwork",
	"67369282zy.skadnetwork",
	"6qx585k4p6.skadnetwork",
	"6rd35atwn8.skadnetwork",
	"6v7lgmsu45.skadnetwork",
	"6yxyv74ff7.skadnetwork",
	"74b6s63p6l.skadnetwork",
	"7953jerfzd.skadnetwork",
	"79w64w269u.skadnetwork",
	"7bxrt786m8.skadnetwork",
	"7fbxrn65az.skadnetwork",
	"7fmhfwg9en.skadnetwork",
	"7k3cvf297u.skadnetwork",
	"7tnzynbdc7.skadnetwork",
	"84993kbrcf.skadnetwork",
	"866k9ut3g3.skadnetwork",
	"87u5trcl3r.skadnetwork",
	"88k8774x49.skadnetwork",
	"899vrgt9g8.skadnetwork",
	"8qiegk9qfv.skadnetwork",
	"8w3np9l82g.skadnetwork",
	"9wsyqb3ku7.skadnetwork",
	"au67k4efj4.skadnetwork",
	"axh5283zss.skadnetwork",
	"b53axzn49s.skadnetwork",
	"b55w3d8y8z.skadnetwork",
	"c3frkrj4fj.skadnetwork",
	"c7g47wypnu.skadnetwork",
	"ce8ybjwass.skadnetwork",
	"cp8zw746q7.skadnetwork",
	"cs644xg564.skadnetwork",
	"cwn433xbcr.skadnetwork",
	"d7g9azk84q.skadnetwork",
	"dd3a75yxkv.skadnetwork",
	"dmv22haz9p.skadnetwork",
	"dn942472g5.skadnetwork",
	"dr774724x4.skadnetwork",
	"dt3cjx1a9i.skadnetwork",
	"dticjx1a9i.skadnetwork",
	"eqhxz8m8av.skadnetwork",
	"f2zub97jtl.skadnetwork",
	"f3h7jpbg97.skadnetwork",
	"fkak3gfpt6.skadnetwork",
	"fq6vru337s.skadnetwork",
	"fz2k2k5tej.skadnetwork",
	"g3y426g9ed.skadnetwork",
	"g69uk9uh2b.skadnetwork",
	"g6gcrrvk4p.skadnetwork",
	"glqzh8vgby.skadnetwork",
	"h5jmj969g5.skadnetwork",
	"h65wbv5k3f.skadnetwork",
	"h8vml93bkz.skadnetwork",
	"hjevpa356n.skadnetwork",
	"jk2fsx2rgz.skadnetwork",
	"k6y4y55b64.skadnetwork",
	"ln5gz23vtd.skadnetwork",
	"m297p6643m.skadnetwork",
	"m5mvw97r93.skadnetwork",
	"mwcgp9hppj.skadnetwork",
	"nfqy3847ph.skadnetwork",
	"nrt9jy4kw9.skadnetwork",
	"ns5j362hk7.skadnetwork",
	"pt89h2hlb7.skadnetwork",
	"qlbq5gtkt8.skadnetwork",
	"qu637u8glc.skadnetwork",
	"qwpu75vrh2.skadnetwork",
	"r8lj5b58b5.skadnetwork",
	"sczv5946wb.skadnetwork",
	"t3b3f7n3x8.skadnetwork",
	"t6d3zquu66.skadnetwork",
	"t7ky8fmwkd.skadnetwork",
	"tmhh9296z4.skadnetwork",
	"tskbem2b5g.skadnetwork",
	"tvvz7th9br.skadnetwork",
	"uzqba5354d.skadnetwork",
	"vc83br9sjg.skadnetwork",
	"vhf287vqwu.skadnetwork",
	"vutu7akeur.skadnetwork",
	"w28pnjg2k4.skadnetwork",
	"w7jznl3r6g.skadnetwork",
	"x5854y7y24.skadnetwork",
	"x8jxxk4ff5.skadnetwork",
	"x8yj322td6.skadnetwork",
	"xga6mpmplv.skadnetwork",
	"xmn954pzmp.skadnetwork",
	"xx9sdjej2w.skadnetwork",
	"y755zyxw56.skadnetwork",
	"z5b3gh5ugf.skadnetwork",
	"z959bm4gru.skadnetwork",
];

/**
 * Add SKAdNetwork identifiers to Info.plist.
 *
 * Designed to mirror Invertase's `react-native-google-mobile-ads` API
 * (`sk_ad_network_items`): the user passes a flat array of strings, the
 * plugin deduplicates them against any existing entries already in
 * Info.plist (e.g. from another plugin) and inserts the missing ones.
 *
 * No defaults are auto-applied. If you want the bundled AppLovin MAX list,
 * import it explicitly from this library:
 *
 *   import { DEFAULT_SKADNETWORK_IDENTIFIERS } from "@fumitakayamada/expo-applovin-max";
 *
 *   plugins: [
 *     ["@fumitakayamada/expo-applovin-max", {
 *       skAdNetworkItems: DEFAULT_SKADNETWORK_IDENTIFIERS,
 *     }],
 *   ]
 *
 * @param {object} config Expo config
 * @param {object} options
 * @param {string[]} options.skAdNetworkItems
 *   Flat array of SKAdNetwork identifier strings to inject into the
 *   `SKAdNetworkItems` array in Info.plist. Each entry is a bare
 *   identifier like `"cstr6suwn9.skadnetwork"`. If empty or omitted,
 *   this plugin is a no-op.
 */
function withSKAdNetwork(config, options = {}) {
	const items = options.skAdNetworkItems;
	if (!Array.isArray(items) || items.length === 0) {
		console.log(
			"[withSKAdNetwork] No skAdNetworkItems provided, skipping (pass an array to enable)",
		);
		return config;
	}

	// Dedupe and sort so the order is stable across builds (helps diffability
	// of generated Info.plist).
	const uniqueSorted = [...new Set(items)].sort();

	return withInfoPlist(config, (config) => {
		const plist = config.modResults;

		if (!plist.SKAdNetworkItems) {
			plist.SKAdNetworkItems = [];
		}

		// Don't double-add identifiers that another plugin or the user
		// already wrote into Info.plist.
		const existingIdentifiers = new Set(
			plist.SKAdNetworkItems.map((item) => item.SKAdNetworkIdentifier),
		);

		let addedCount = 0;
		for (const identifier of uniqueSorted) {
			if (!existingIdentifiers.has(identifier)) {
				plist.SKAdNetworkItems.push({ SKAdNetworkIdentifier: identifier });
				addedCount++;
			}
		}

		console.log(
			`[withSKAdNetwork] ✓ Added ${addedCount} SKAdNetwork identifiers (total: ${plist.SKAdNetworkItems.length})`,
		);

		return config;
	});
}

module.exports = withSKAdNetwork;
/**
 * The bundled list of SKAdNetwork identifiers covering AppLovin MAX and all
 * mediated networks (AppLovin, Amazon, BidMachine, DT Exchange, Google
 * AdMob/Bidding, InMobi, ironSource, Liftoff/Vungle, Meta, Mintegral,
 * Pangle, Unity Ads, plus a long tail of common networks).
 *
 * Source: AppLovin MAX SKAdNetwork docs:
 *   https://support.axon.ai/en/max/react-native/overview/skadnetwork
 *
 * Re-export this constant via the library's main entry so that consumers
 * can pass it to `skAdNetworkItems` without having to maintain the list
 * themselves:
 *
 *   import { DEFAULT_SKADNETWORK_IDENTIFIERS } from "@fumitakayamada/expo-applovin-max";
 */
module.exports.DEFAULT_SKADNETWORK_IDENTIFIERS = SKADNETWORK_IDENTIFIERS;

const pillars=[
  ["01","Human intent","The agent starts from a clear goal, not unrestricted authority."],
  ["02","Live quote","Price, provider, network and expiry are frozen before approval."],
  ["03","Spend policy","Limits, categories and approved merchants are checked automatically."],
  ["04","Approval","The user reviews the exact action before any signature is requested."],
  ["05","Execution","A connector performs one authorized action with replay protection."],
  ["06","Proof","Payment and fulfillment are recorded as separate evidence."],
];
const pilots=[
  ["Stellar testnet","DeFindex","Prepare a vault action, enforce policy, sign externally and verify on-chain."],
  ["Real-world booking","Innovation space","Check availability, reserve a day pass and prove check-in with QR or OTP."],
  ["Digital work","Task marketplace","Turn a brief and budget into a trackable job with delivery evidence."],
  ["Global travel","Travala","Search and prepare travel options through MCP before enabling paid booking."],
];
export default function Home(){return <main>
  <nav className="nav shell"><a className="brand" href="#top"><b>AA</b>agent-assistant</a><div><a href="#product">Product</a><a href="#pilots">Pilots</a><a href="/developers">Developers</a><a href="/connections">Integration Lab</a><a href="#partners">Partners</a></div></nav>
  <section className="hero shell" id="top"><div><p className="eyebrow">COMMERCE INFRASTRUCTURE FOR AI AGENTS</p><h1>Agents can take action. <em>You stay in control.</em></h1><p className="lede">A non-custodial control layer for agents that discover, book, hire and pay under policies defined by real people.</p><div className="actions"><a href="/developers">Connect to the MCP</a><a href="#partners">Run a pilot</a></div><small>Live MCP sandbox | Durable storage ready | No real funds enabled</small></div>
  <aside><header><span>Action ready for review</span><b>TESTNET</b></header><p>Reserve a workspace for tomorrow and prepare a 20 USDC vault deposit.</p><dl><div><dt>Maximum budget</dt><dd>60 USDC</dd></div><div><dt>This action</dt><dd>20 USDC</dd></div><div><dt>Network</dt><dd>Stellar</dd></div></dl><strong className="approved">Policy checks passed</strong><button>Review and approve</button><small>Your private key never reaches our server.</small></aside></section>
  <section className="section shell" id="product"><p className="eyebrow">THE MISSING CONTROL PLANE</p><h2>One transaction language for people, agents and merchants.</h2><div className="cards"><article><span>FOR PEOPLE</span><h3>Useful autonomy, hard limits</h3><p>Set budgets, approved providers and confirmation rules without handing over unrestricted access.</p></article><article><span>FOR AGENTS</span><h3>One protocol, many actions</h3><p>Search offers, prepare intents, request approval and retrieve receipts through a remote MCP.</p></article><article><span>FOR MERCHANTS</span><h3>Become agent-ready</h3><p>Publish structured offers through a hosted catalog, API, MCP, WebMCP or a deeper enterprise integration.</p></article></div></section>
  <section className="dark"><div className="shell"><p className="eyebrow">THE TRANSACTION LIFECYCLE</p><h2>Every action follows the same safety contract.</h2><div className="flow">{pillars.map(p=><div key={p[0]}><b>{p[0]}</b><strong>{p[1]}</strong><small>{p[2]}</small></div>)}</div></div></section>
  <section className="section shell" id="pilots"><p className="eyebrow">INITIAL ACTION NETWORK</p><h2>Four pilots. One reusable architecture.</h2><div className="pilots">{pilots.map((p,i)=><article className={i===0?"hot":""} key={p[1]}><span>{p[0]}</span><h3>{p[1]}</h3><p>{p[2]}</p></article>)}</div></section>
  <section className="wallet shell"><div><p className="eyebrow">NON-CUSTODIAL BY DESIGN</p><h2>The agent proposes. Policy decides. The wallet signs.</h2><p>Identity, authorization and settlement remain separate so no single component receives unlimited authority.</p></div><div><span>DISCOVER <small>MCP + WebMCP</small></span><span>CONTROL <small>Intent + policy</small></span><span>AUTHORIZE <small>Human or delegated</small></span><span>VERIFY <small>Receipt + fulfillment</small></span></div></section>
  <section className="section shell" id="partners"><div className="partner"><div><p className="eyebrow">FOUNDING PILOT PARTNERS</p><h2>Make one real business action agent-ready.</h2><p>We start in sandbox or testnet, without custody and without touching production payments.</p></div><a href="mailto:partners@agent-assistant.com?subject=Founding%20pilot">Propose a pilot</a></div></section>
  <footer className="shell"><span className="brand"><b>AA</b>agent-assistant</span><p>Built in Latin America for a global agent economy.</p></footer>
</main>}

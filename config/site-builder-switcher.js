/**
 * SYNOPSIS: Site Builder variant switcher template with light/dark toggle and competitor comparison popup.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */
import { SITE_BUILDER_PRICING } from './site-builder-pricing.js';

const TAILWIND_CDN = 'https://cdn.tailwindcss.com';
const ALPINE_CDN = 'https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js';

function safeJson(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

function buildCompareCards(benchmark, presence) {
  const cards = [];
  if (benchmark?.scorecards?.length) {
    for (const c of benchmark.scorecards) {
      let display = c.url || 'Unknown competitor';
      try { display = new URL(c.url).hostname.replace(/^www\./, ''); } catch { display = c.url; }
      cards.push({
        title: display,
        fullUrl: c.url || '',
        type: 'competitor',
        score: c.score,
        scoreLabel: c.score ? `${c.score}/10` : 'N/A',
        strengths: c.doesWell || [],
        weaknesses: c.doesPoorly || [],
        summary: c.summary || '',
        why: `This competitor scored ${c.score ?? 'N/A'}/10. We can beat it by adopting its strengths and fixing its weaknesses.`,
      });
    }
    if (benchmark.designBrief?.adopt?.length || benchmark.designBrief?.beat?.length) {
      cards.push({
        title: 'Your new design',
        type: 'design',
        subtitle: benchmark.designBrief.positioning || 'Built to win this market',
        strengths: benchmark.designBrief.adopt || [],
        weaknesses: benchmark.designBrief.beat || [],
        summary: benchmark.designBrief.text || '',
        why: 'We designed your new site to copy the best patterns in your market and fix the gaps the competitors are ignoring.',
      });
    }
  }
  if (presence?.perChannel?.length) {
    cards.push({
      title: 'Your presence vs competitors',
      type: 'presence',
      channels: presence.perChannel.map((c) => ({ channel: c.channel, verdict: c.verdict, clientScore: c.clientScore, competitorAvg: c.competitorAvg })),
      summary: presence.gap?.summary || '',
      biggestOpportunity: presence.gap?.biggestOpportunity || '',
      quickWins: presence.gap?.quickWins || [],
      why: 'This shows how your online presence stacks up against the same competitors across every channel.',
    });
  }
  if (!cards.length) {
    cards.push({
      title: 'Add competitors to compare',
      type: 'empty',
      summary: 'Give us competitor URLs (or we’ll discover them) and we’ll show how your new site beats them on every channel.',
      why: 'Competitor context is how we make sure your site is not just pretty — it actually wins your market.',
      quickWins: ['Add 2-4 competitor URLs', 'We audit each site', 'You get a side-by-side comparison with action steps'],
    });
  }
  return cards;
}

export function getVariantSwitcherHtml({ info, clientId, variants, editToken = '', benchmark = null, presence = null, baseUrl = '' }) {
  const name = (info.businessName || 'Your Website').replace(/</g, '&lt;');
  const selectBase = baseUrl ? '/api/v1/sites/select-design' : '';
  const publishUrl = baseUrl ? `/api/v1/sites/publish/checkout?clientId=${encodeURIComponent(clientId)}` : '';
  const editorUrl = baseUrl && editToken
    ? `/api/v1/sites/editor?clientId=${encodeURIComponent(clientId)}&token=${encodeURIComponent(editToken)}`
    : '';
  const data = safeJson(variants.map((v) => ({ id: v.id, name: v.name, tier: v.tier || 'paid', blurb: v.blurb, file: v.file })));
  const compareCards = buildCompareCards(benchmark, presence);
  const compareJson = safeJson(compareCards);
  return `<!DOCTYPE html>
<html lang='en'>
<head>
<meta charset='UTF-8'>
<meta name='viewport' content='width=device-width, initial-scale=1.0'>
<title>${name} — Choose your design</title>
<script src='${TAILWIND_CDN}'></script>
<style>
  :root { --bar: #0f172a; }
  body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
  .chip { transition: all .15s ease; }
  .chip[aria-pressed='true'] { background:#fff; color:#0f172a; font-weight:600; }
  .chip .tier { font-size:10px; opacity:.7; margin-left:6px; text-transform:uppercase; }
  iframe { border:0; width:100%; height:calc(100vh - 128px); display:block; background:#fff; }
</style>
</head>
<body class='bg-slate-900'>
  <div x-data='switcher()' x-init='init()'>
    <header class='bg-slate-900 text-white px-4 pt-3 pb-3 sticky top-0 z-10 shadow-lg'>
      <div class='flex items-center justify-between gap-3 flex-wrap'>
        <div>
          <p class='text-xs uppercase tracking-widest text-slate-400'>Preview for</p>
          <h1 class='text-lg font-semibold leading-tight'>${name}</h1>
        </div>
        <div class='text-right flex flex-wrap gap-2 justify-end items-center'>
          ${editorUrl ? `<a href='${editorUrl}' class='bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold px-3 py-2 rounded-lg'>Editor</a>` : ''}
          <button @click='toggleCompare()' class='bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold px-3 py-2 rounded-lg'>Compare</button>
          <button @click='toggleTheme()' class='bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold px-3 py-2 rounded-lg' x-text='theme === darkTheme ? lightLabel : darkLabel'>Dark</button>
          <a :href='checkoutUrl' class='bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-3 py-2 rounded-lg'><span x-text='selected === customDesignId ? customDesignLabel : publishLabel'></span></a>
          <button @click='choose()' class='bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold px-4 py-2 rounded-lg'>Use this design</button>
          <p class='text-xs text-slate-400 mb-1 w-full' x-text='current.name + (current.tier === paidTier ? paidPublishNote : freePublishNote)'></p>
          <form @submit.prevent='applyCompCode()' class='w-full flex flex-wrap gap-2 items-center justify-end mt-1'>
            <label class='text-xs text-slate-400 flex items-center gap-2'>
              Have a code?
              <input x-model='compCode' type='text' autocomplete='off' autocapitalize='characters' placeholder='Complimentary code' class='bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-sm text-white w-44' />
            </label>
            <button type='submit' class='bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold px-3 py-2 rounded-lg'>Apply free publish</button>
          </form>
        </div>
      </div>
      <p class='text-xs text-slate-400 mt-2'>10 free niche templates · 40 more from the 50-template catalog · $35 custom co-design (pay only when you approve). Toggle to compare — each layout is structurally different.</p>
      <nav class='mt-2 flex gap-2 overflow-x-auto pb-1'>
        <template x-for='(v,i) in variants' :key='v.id'>
          <button class='chip whitespace-nowrap text-sm px-3 py-1.5 rounded-full border border-slate-600 text-slate-200 hover:border-slate-400'
            :aria-pressed='i===index' @click='show(i)' :title='v.blurb'>
            <span x-text='v.name'></span><span class='tier' x-text='v.tier === paidTier ? paidTierLabel : freeTierLabel'></span>
          </button>
        </template>
        <button class='chip whitespace-nowrap text-sm px-3 py-1.5 rounded-full border border-amber-500 text-amber-300 hover:border-amber-300' @click='showCustom()' title='Co-design a unique template and website with us; pay only when you approve it.'>
          <span>Custom co-design</span><span class='tier'>$35</span>
        </button>
      </nav>
      <p class='text-xs text-slate-300 mt-2 max-w-2xl' x-text='current.blurb || empty'></p>
    </header>
    <iframe :src='frameUrl' :title='current.name' x-ref='frame'></iframe>
    <div x-show='saved' x-transition class='fixed bottom-4 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg shadow-xl' x-text='savedMsg'>
    </div>
    <div x-show='compareOpen' x-transition class='fixed inset-0 z-50 bg-black/70 flex items-start justify-center p-4 sm:p-8' @click.self='compareOpen = false'>
      <div class='bg-slate-900 text-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-700'>
        <div class='sticky top-0 bg-slate-900 px-6 py-4 border-b border-slate-700 flex items-center justify-between'>
          <h2 class='text-lg font-semibold' x-text='currentCompare.title'></h2>
          <button @click='compareOpen = false' class='text-slate-400 hover:text-white text-2xl leading-none'>&times;</button>
        </div>
        <div class='p-6'>
          <div class='flex items-center gap-3 mb-4'>
            <span class='text-3xl font-bold' x-text='currentCompare.scoreLabel || empty'></span>
            <span class='text-sm px-2 py-1 rounded bg-slate-700 text-slate-200' x-text='typeLabels[currentCompare.type] || typeLabels.empty'></span>
          </div>
          <p class='text-slate-300 mb-6' x-text='currentCompare.summary || empty'></p>
          <div class='grid md:grid-cols-2 gap-6'>
            <div x-show='currentCompare.strengths && currentCompare.strengths.length'>
              <h3 class='text-sm font-semibold uppercase tracking-wider text-emerald-400 mb-2'>Why it is strong</h3>
              <ul class='space-y-2'>
                <template x-for='s in currentCompare.strengths' :key='s'>
                  <li class='text-sm text-slate-300'>- <span x-text='s'></span></li>
                </template>
              </ul>
            </div>
            <div x-show='currentCompare.weaknesses && currentCompare.weaknesses.length'>
              <h3 class='text-sm font-semibold uppercase tracking-wider text-rose-400 mb-2'>Where it is weak</h3>
              <ul class='space-y-2'>
                <template x-for='w in currentCompare.weaknesses' :key='w'>
                  <li class='text-sm text-slate-300'>- <span x-text='w'></span></li>
                </template>
              </ul>
            </div>
          </div>
          <div x-show='currentCompare.type === presenceType && currentCompare.channels && currentCompare.channels.length' class='mt-6'>
            <h3 class='text-sm font-semibold uppercase tracking-wider text-violet-400 mb-2'>Channel by channel</h3>
            <div class='grid gap-3'>
              <template x-for='ch in currentCompare.channels' :key='ch.channel'>
                <div class='flex items-center justify-between p-3 rounded-lg bg-slate-800'>
                  <span class='capitalize font-medium' x-text='ch.channel'></span>
                  <div class='text-right text-sm'>
                    <span class='text-slate-400'>You: <span x-text='ch.clientScore ?? noneLabel'></span></span>
                    <span class='mx-2 text-slate-500'>/</span>
                    <span class='text-slate-400'>Them: <span x-text='ch.competitorAvg ?? naLabel'></span></span>
                    <span class='ml-2 px-2 py-0.5 rounded text-xs font-semibold' :class='verdictClasses[ch.verdict] || verdictClasses.default' x-text='ch.verdict'></span>
                  </div>
                </div>
              </template>
            </div>
          </div>
          <div x-show='currentCompare.biggestOpportunity' class='mt-6 p-4 rounded-lg bg-violet-900/30 border border-violet-700'>
            <h3 class='text-sm font-semibold uppercase tracking-wider text-violet-300 mb-1'>Biggest opportunity</h3>
            <p class='text-sm text-slate-200' x-text='currentCompare.biggestOpportunity'></p>
          </div>
          <div x-show='currentCompare.quickWins && currentCompare.quickWins.length' class='mt-6'>
            <h3 class='text-sm font-semibold uppercase tracking-wider text-amber-400 mb-2'>Quick wins</h3>
            <ul class='space-y-2'>
              <template x-for='w in currentCompare.quickWins' :key='w'>
                <li class='text-sm text-slate-300'>- <span x-text='w'></span></li>
              </template>
            </ul>
          </div>
          <div x-show='currentCompare.why' class='mt-6 p-4 rounded-lg bg-slate-800 text-sm text-slate-300' x-text='currentCompare.why'></div>
        </div>
        <div class='sticky bottom-0 bg-slate-900 px-6 py-4 border-t border-slate-700 flex items-center justify-between'>
          <button @click='comparePrev()' class='px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm' :disabled='compareIndex === 0'>Previous</button>
          <span class='text-sm text-slate-400' x-text='compareIndex + 1 + ofLabel + compareCards.length'></span>
          <button @click='compareNext()' class='px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm' :disabled='compareIndex === compareCards.length - 1'>Next</button>
        </div>
      </div>
    </div>
  </div>
<script>
  window.luminCompareData = ${compareJson};
</script>
<script src='${ALPINE_CDN}' defer></script>
<script>
  function switcher(){
    return {
      variants: ${data},
      index: 0,
      selected: null,
      selectedTier: null,
      saved: false,
      savedMsg: '',
      theme: 'light',
      darkTheme: 'dark',
      lightLabel: 'Light',
      darkLabel: 'Dark',
      customDesignId: 'custom',
      customDesignLabel: 'Custom co-design',
      publishLabel: 'Publish ${SITE_BUILDER_PRICING.publish.display}',
      paidTier: 'paid',
      paidTierLabel: '$1',
      freeTierLabel: 'free',
      paidPublishNote: ' ($1 at publish)',
      freePublishNote: '',
      empty: '',
      noneLabel: 'none',
      naLabel: 'n/a',
      presenceType: 'presence',
      ofLabel: ' of ',
      pageTitle: ${safeJson(name)},
      frameUrl: '',
      compareOpen: false,
      compareIndex: 0,
      compCode: '',
      compareCards: (typeof window !== 'undefined' && window.luminCompareData) || [],
      typeLabels: { competitor: 'Competitor score', presence: 'Presence gap', design: 'Design strategy', empty: 'Insight' },
      verdictClasses: { ahead: 'bg-emerald-900 text-emerald-300', behind: 'bg-rose-900 text-rose-300', even: 'bg-slate-700 text-slate-300', default: 'bg-slate-700 text-slate-300' },
      selectedPaidMsg: ' selected — pay the $1 template fee when you publish.',
      selectedFreeMsg: ' selected — free design.',
      customSelectedMsg: 'Custom co-design selected — you will only pay when you approve the final design.',
      get current(){ return this.variants[this.index]; },
      get checkoutUrl(){
        const base = ${safeJson(publishUrl)};
        if (!base) return '';
        let url = base;
        if (this.selected === this.customDesignId) url += '&templateTier=template-custom';
        else if (this.selected && this.selectedTier === this.paidTier) url += '&templateTier=template-additional&selectedDesign=' + encodeURIComponent(this.selected);
        const code = String(this.compCode || '').trim();
        if (code) url += '&code=' + encodeURIComponent(code);
        return url;
      },
      applyCompCode(){
        const code = String(this.compCode || '').trim();
        if (!code) { this.saved = true; this.savedMsg = 'Enter a complimentary code first.'; setTimeout(()=>{ this.saved = false; }, 3000); return; }
        const url = this.checkoutUrl;
        if (!url) return;
        window.location.href = url;
      },
      get currentCompare(){ return this.compareCards[this.compareIndex] || {}; },
      init(){
        const params = new URLSearchParams(location.search);
        const h = parseInt(params.get('v'));
        if(!isNaN(h) && this.variants[h]) this.index = h;
        const t = params.get('theme');
        if(t === this.darkTheme || t === this.lightLabel.toLowerCase()) this.theme = t;
        document.title = this.pageTitle;
        this.show(this.index);
      },
      show(i){
        this.index = i;
        this.selected = this.variants[i].id;
        this.selectedTier = this.variants[i].tier;
        this.saved = false;
        this.frameUrl = this.current.file + (this.current.file.includes('?') ? '&' : '?') + 'theme=' + this.theme;
        this.$nextTick(() => {
          if (this.$refs.frame) {
            const apply = () => { try { this.$refs.frame.contentWindow.postMessage({type:'lumin-theme', theme:this.theme}, '*'); } catch(e){} };
            if (this.$refs.frame.contentWindow && this.$refs.frame.contentWindow.document && this.$refs.frame.contentWindow.document.readyState === 'complete') { apply(); } else { this.$refs.frame.onload = apply; }
          }
        });
      },
      showCustom(){ this.selected = this.customDesignId; this.selectedTier = this.customDesignId; this.saved = true; this.savedMsg = this.customSelectedMsg; setTimeout(()=>{ this.saved = false; }, 4000); },
      choose(){
        this.saved = true;
        this.selected = this.current.id;
        this.selectedTier = this.current.tier;
        if (this.selectedTier === this.paidTier) {
          this.savedMsg = this.current.name + this.selectedPaidMsg;
        } else {
          this.savedMsg = this.current.name + this.selectedFreeMsg;
        }
        var base = ${safeJson(selectBase)};
        if(base){ try { navigator.sendBeacon ? navigator.sendBeacon(base + '?id=${clientId}&style=' + this.current.id) : fetch(base + '?id=${clientId}&style=' + this.current.id, {mode:'no-cors'}); } catch(e){} }
        setTimeout(()=>{ this.saved = false; }, 4000);
      },
      toggleTheme(){
        this.theme = this.theme === this.darkTheme ? this.lightLabel.toLowerCase() : this.darkTheme;
        const url = new URL(location.href);
        url.searchParams.set('theme', this.theme);
        history.replaceState({}, '', url);
        try { this.$refs.frame.contentWindow.postMessage({type:'lumin-theme', theme:this.theme}, '*'); } catch(e){}
      },
      toggleCompare(){ this.compareOpen = !this.compareOpen; this.compareIndex = 0; },
      compareNext(){ if(this.compareIndex < this.compareCards.length - 1) this.compareIndex++; },
      comparePrev(){ if(this.compareIndex > 0) this.compareIndex--; },
    };
  }
</script>
</body>
</html>`;
}
// The app shell (spec §3–4): ink header with market clocks and the pulse bar, a slim nav rail, the
// routed main pane and the context panel. The document never scrolls; each pane owns its scroll.
import { useCallback, useMemo, useState } from 'react';
import { useBridge } from './useBridge';
import { useRoute } from './app/router';
import { useTheme } from './hooks/useTheme';
import { Header, type PulseLane } from './app/Header';
import { NavRail, TabBar } from './app/Nav';
import { ChatView } from './app/ChatView';
import { TodayView } from './app/TodayView';
import { BookView } from './app/BookView';
import { Rail } from './components/Rail';
import { SourceDrawer } from './components/SourceDrawer';

export function App() {
  const { turns, rail, connected, busy, replay, saved, ask, stop, newChat } = useBridge();
  const { route, go } = useRoute();
  const { theme, cycle } = useTheme();
  const [source, setSource] = useState<string | null>(null);
  const [seed, setSeed] = useState<string | null>(null);
  const me = rail?.me;
  const manager = me?.role === 'manager';
  const canAsk = connected && !busy;
  const live = busy && !replay && !saved;

  // Every button anywhere is a prompt: send it, then show the conversation (ADR-0006).
  const askAndShow = useCallback((text: string) => {
    if (!canAsk || !text.trim()) return;
    ask(text);
    go('chat');
  }, [ask, canAsk, go]);
  const ctx = useMemo(() => ({ onPrompt: askAndShow, onSource: setSource, disabled: !canAsk }), [askAndShow, canAsk]);

  const lanes: PulseLane[] = useMemo(() => {
    const running = turns.find(t => t.running);
    return (running?.turn.lanes ?? []).map(l => ({ id: l.id, agent: l.agent.toLowerCase(), running: l.status === 'running' }));
  }, [turns]);

  const status = replay ? 'Replay' : saved ? 'Saved result' : !connected ? 'Reconnecting…' : live ? 'Working…' : 'Ready';
  const onNewChat = useCallback(() => { newChat(); go('chat'); }, [newChat, go]);

  return (
    <div className="app">
      <Header rail={rail} status={status} live={live} theme={theme} onTheme={cycle} onNewChat={onNewChat} newChatDisabled={busy} lanes={lanes} />
      <div className={`body r-${route}`}>
        <NavRail route={route} go={go} busy={live} />
        <main className="main" id="main">
          {route === 'today' && <TodayView rail={rail} canAsk={canAsk} busy={busy} live={live} ask={askAndShow} stop={stop} openSource={setSource} />}
          {/* Chat stays mounted so its scroll position and draft survive a trip to Today or Book. */}
          <div className="route-chat" hidden={route !== 'chat'}>
            <ChatView turns={turns} ctx={ctx} manager={manager} firstName={me?.name.split(' ')[0] ?? ''} busy={busy} canAsk={canAsk}
              live={live} ask={ask} stop={stop} seed={seed} onSeedUsed={() => setSeed(null)} />
          </div>
          {route === 'book' && <BookView rail={rail} ctx={ctx} />}
        </main>
        {route !== 'today' && <Rail rail={rail} onSource={setSource} onPrompt={askAndShow} disabled={!canAsk} />}
      </div>
      <TabBar route={route} go={go} busy={live} />
      {source && <SourceDrawer path={source} onClose={() => setSource(null)} />}
    </div>
  );
}

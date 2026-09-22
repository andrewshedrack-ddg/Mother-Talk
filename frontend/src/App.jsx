import { BrowserRouter, Routes, Route, Navigate, Link, useParams, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './Auth';
import './index.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-primary-50"><div className="animate-spin h-10 w-10 border-4 border-primary-600 border-t-transparent rounded-full"></div></div>;
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-primary-50"><div className="animate-spin h-10 w-10 border-4 border-primary-600 border-t-transparent rounded-full"></div></div>;
  return user ? <Navigate to="/stories" replace /> : children;
}

function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [cpw, setCpw] = useState('');
  const [err, setErr] = useState('');
  const [ld, setLd] = useState(false);

  const sub = async (e) => {
    e.preventDefault(); setErr(''); setLd(true);
    try {
      if (isLogin) await login(email, pw);
      else { if (pw !== cpw) throw new Error('Passwords mismatch'); await register(email, pw); }
      navigate('/stories');
    } catch (e) { setErr(e.message); } finally { setLd(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-50 p-4">
      <div className="w-full max-w-md card p-8">
        <h1 className="text-3xl font-serif font-bold text-primary-800 text-center mb-2">Mother Talk</h1>
        <p className="text-gray-600 text-center mb-8">Interactive stories, shared moments</p>
        <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">{isLogin ? 'Welcome back' : 'Create account'}</h2>
        {err && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">{err}</div>}
        <form onSubmit={sub} className="space-y-4">
          <div><label className="label">Email</label><input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required disabled={ld} /></div>
          <div><label className="label">Password</label><input className="input" type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••" required disabled={ld} /></div>
          {!isLogin && <div><label className="label">Confirm</label><input className="input" type="password" value={cpw} onChange={e=>setCpw(e.target.value)} placeholder="••••••••" required disabled={ld} /></div>}
          <button className="btn-primary w-full py-3" disabled={ld}>{ld ? 'Loading...' : (isLogin ? 'Sign in' : 'Create account')}</button>
        </form>
        <p className="mt-6 text-center text-gray-600 text-sm">{isLogin ? "Don't have an account? " : 'Already have one? '}<button onClick={()=>setIsLogin(!isLogin)} className="text-primary-600 hover:underline">{isLogin ? 'Sign up' : 'Sign in'}</button></p>
      </div>
    </div>
  );
}

function StoryList() {
  const { user } = useAuth();
  const [stories, setStories] = useState([]);
  const [ld, setLd] = useState(true);

  useEffect(() => { fetch('/stories/').then(r=>r.json()).then(setStories).finally(()=>setLd(false)); }, []);

  if (ld) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-10 w-10 border-4 border-primary-600 border-t-transparent rounded-full"></div></div>;

  return (
    <div className="min-h-screen bg-primary-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10"><div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
        <h1 className="font-serif text-xl font-medium text-gray-900">Stories</h1>
        <div className="flex items-center gap-3">{user ? <Link to="/progress" className="btn-ghost text-sm">My Progress</Link> : <span className="text-sm text-gray-500">Sign in to track progress</span>}</div>
      </div></header>
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8"><h2 className="font-serif text-3xl font-bold text-gray-900 mb-2">Available Stories</h2><p className="text-gray-600">Choose a story to begin</p></div>
        {stories.length === 0 ? <div className="card p-12 text-center"><h3 className="text-xl font-semibold">No stories yet</h3></div> : (
          <div className="grid gap-4 md:grid-cols-2">
            {stories.map(s => (
              <Link key={s.id} to={`/stories/${s.id}`} className="card p-6 hover:shadow-lg transition border-primary-100 hover:border-primary-200">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white">
                    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                  </div>
                  <div><h3 className="font-serif text-lg font-semibold text-gray-900">{s.title}</h3><p className="mt-1 text-sm text-gray-600 line-clamp-2">{s.description}</p>
                    <div className="mt-3 text-xs text-gray-500">{s.nodes?.length || 0} scenes</div></div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between"><span className="text-sm font-medium text-primary-600">Read Story</span><svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function StoryViewer() {
  const { storyId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [story, setStory] = useState(null);
  const [nodeId, setNodeId] = useState('start');
  const [choices, setChoices] = useState([]);
  const [ld, setLd] = useState(true);
  const [showJourney, setShowJourney] = useState(false);

  const load = useCallback(async () => {
    const s = await fetch(`/stories/${storyId}`).then(r=>r.json());
    setStory(s); setNodeId(s.start_node);
    if (user) { try { const p = await fetch(`/progress/${storyId}`, {headers:{Authorization:`Bearer ${localStorage.getItem('token')}`}}).then(r=>r.json()); setNodeId(p.current_node); setChoices(JSON.parse(p.choices_made)); } catch {} }
    setLd(false);
  }, [storyId, user]);

  useEffect(() => { load(); }, [load]);

  const save = async (nid, ch) => {
    if (!user) return;
    try { await fetch(`/progress/${storyId}`, {method:'PATCH',headers:{'Content-Type':'application/json',Authorization:`Bearer ${localStorage.getItem('token')}`},body:JSON.stringify({current_node:nid,choices_made:ch})}); }
    catch { await fetch('/progress/', {method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${localStorage.getItem('token')}`},body:JSON.stringify({story_id:storyId,current_node:nid,choices_made:ch})}); }
  };

  const pick = (c) => { const nc = [...choices, c.text]; setChoices(nc); setNodeId(c.next_node); save(c.next_node, nc); };

  if (ld) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-10 w-10 border-4 border-primary-600 border-t-transparent rounded-full"></div></div>;
  if (!story) return null;

  const node = story.nodes.find(n => n.id === nodeId);
  const isEnd = !node?.choices?.length;

  return (
    <div className="min-h-screen bg-primary-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10"><div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
        <button onClick={()=>navigate('/stories')} className="btn-ghost p-2" aria-label="Back"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
        <h1 className="font-serif text-xl font-medium text-gray-900 truncate">{story.title}</h1><div className="w-10" />
      </div></header>
      <main className="max-w-3xl mx-auto px-4 py-8">
        <article className="card p-6 md:p-10">
          <div className="story-text"><p className="whitespace-pre-wrap">{node?.text}</p></div>
          {isEnd && <div className="mt-12 pt-8 border-t border-gray-100 text-center"><svg className="mx-auto h-12 w-12 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <h2 className="mt-4 text-2xl font-serif font-semibold text-gray-900">Chapter Complete</h2>
            <p className="mt-2 text-gray-600">You reached the end.</p>
            <div className="mt-6 flex gap-3 justify-center"><button onClick={()=>{setNodeId(story.start_node);setChoices([]);save(story.start_node,[]);}} className="btn-primary">Read Again</button><button onClick={()=>navigate('/stories')} className="btn-secondary">All Stories</button></div></div>}
          {!isEnd && <div className="mt-10 space-y-3">{node.choices.map((c,i)=>(<button key={i} onClick={()=>pick(c)} className="btn-secondary w-full text-left p-4 hover:bg-primary-50 hover:border-primary-700 transition"><span className="flex items-center gap-3"><span className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-medium">{i+1}</span><span className="text-gray-800">{c.text}</span></span></button>))}</div>}
          {user && <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between"><div className="flex items-center gap-2 text-sm text-gray-500"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>{choices.length} choice{choices.length!==1?'s':''} made</div><button onClick={()=>setShowJourney(!showJourney)} className="btn-ghost text-sm">{showJourney?'Hide':'Show'} Journey</button></div>}
          {showJourney && choices.length>0 && <div className="mt-6 p-4 bg-primary-50 rounded-lg border border-primary-100"><h3 className="font-medium text-primary-800 mb-3">Your Journey</h3><ol className="space-y-2">{choices.map((c,i)=>(<li key={i} className="flex gap-3 text-sm text-gray-700"><span className="w-6 h-6 rounded-full bg-primary-200 text-primary-800 flex items-center justify-center text-xs font-medium">{i+1}</span><span>{c}</span></li>))}</ol></div>}
        </article>
      </main>
    </div>
  );
}

function ProgressDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [ld, setLd] = useState(true);

  useEffect(() => { fetch('/progress/', {headers:{Authorization:`Bearer ${localStorage.getItem('token')}`}}).then(r=>r.json()).then(setList).finally(()=>setLd(false)); }, []);

  if (ld) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-10 w-10 border-4 border-primary-600 border-t-transparent rounded-full"></div></div>;

  return (
    <div className="min-h-screen bg-primary-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10"><div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
        <h1 className="font-serif text-xl font-medium text-gray-900">Your Journey</h1>
        <div className="flex items-center gap-3"><span className="text-sm text-gray-500">{user?.email}</span><button onClick={logout} className="btn-ghost text-sm">Sign Out</button></div>
      </div></header>
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8"><h2 className="font-serif text-3xl font-bold text-gray-900 mb-2">Reading Progress</h2><p className="text-gray-600">{list.length} story{list.length!==1?'s':''} in progress</p></div>
        {list.length===0 ? <div className="card p-12 text-center"><h3 className="text-xl font-semibold">No stories started</h3><p className="mt-2 text-gray-600 max-w-md mx-auto">Begin a story to see progress here.</p><Link to="/stories" className="btn-primary mt-6 inline-block">Browse Stories</Link></div> : (
          <div className="space-y-4">{list.map(p=>(<Link key={p.story_id} to={`/stories/${p.story_id}`} className="card p-6 hover:shadow-lg transition block"><div className="flex items-start justify-between gap-4">
            <div><div className="flex items-center gap-2 mb-2"><span className="text-sm font-medium text-primary-700 bg-primary-100 px-2.5 py-0.5 rounded-full">{p.completed?'Completed':'In Progress'}</span><span className="text-sm text-gray-500">Updated {new Date(p.updated_at).toLocaleDateString()}</span></div>
            <h3 className="font-serif text-lg font-medium text-gray-900">Story: {p.story_id}</h3>
            <p className="mt-1 text-sm text-gray-500">At: <span className="font-medium text-gray-700">{p.current_node}</span></p>
            <p className="mt-1 text-sm text-gray-500">Choices: <span className="font-medium text-gray-700">{p.choices_made?.length || 0}</span></p></div>
            <svg className="flex-shrink-0 h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></div></Link>))}</div>
        )}
      </main>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/stories" element={<ProtectedRoute><StoryList /></ProtectedRoute>} />
      <Route path="/stories/:storyId" element={<ProtectedRoute><StoryViewer /></ProtectedRoute>} />
      <Route path="/progress" element={<ProtectedRoute><ProgressDashboard /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to="/stories" replace />} />
      <Route path="*" element={<Navigate to="/stories" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
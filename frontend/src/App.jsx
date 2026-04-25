import { useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'

const API = '/api'

async function api(path, { token, method = 'GET', body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

const urgencyOptions = ['immediate', 'within today', 'within 3 days']

function Badge({ children, tone = 'slate' }) {
  const tones = {
    green: 'bg-green-100 text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    orange: 'bg-orange-100 text-orange-700',
    red: 'bg-red-100 text-red-700',
    slate: 'bg-slate-100 text-slate-700',
  }

  return <span className={`rounded-full px-2 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>
}

function App() {
  const [token, setToken] = useState('')
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState('auth')
  const [taxonomy, setTaxonomy] = useState([])
  const [providers, setProviders] = useState([])
  const [requests, setRequests] = useState([])
  const [sessions, setSessions] = useState([])
  const [sessionMessages, setSessionMessages] = useState([])
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const [providerDashboard, setProviderDashboard] = useState(null)
  const [seekerDashboard, setSeekerDashboard] = useState(null)
  const [error, setError] = useState('')

  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    password: '',
    city: '',
    bio: '',
  })

  const [onboardingForm, setOnboardingForm] = useState({
    mode: 'both',
    category: 'Tech & Development',
    subcategory: 'Web Development',
    description: '',
    hourlyRate: 20,
    responseTime: 'within 15 min',
    avatarUrl: '',
  })

  const [requestForm, setRequestForm] = useState({
    title: '',
    description: '',
    category: 'Tech & Development',
    subcategory: 'Web Development',
    urgency: 'immediate',
    budget: '',
  })

  const [reviewForm, setReviewForm] = useState({
    sessionId: '',
    revieweeId: '',
    rating: 5,
    comment: '',
  })

  const [messageInput, setMessageInput] = useState('')

  const socket = useMemo(() => io('/', { autoConnect: false }), [])

  const selectedSession = sessions.find((s) => s.id === selectedSessionId)

  const isProviderMode = user?.role === 'provider' || user?.role === 'both'
  const isSeekerMode = user?.role === 'seeker' || user?.role === 'both'

  async function bootstrap() {
    try {
      const [taxonomyRes] = await Promise.all([api('/taxonomy')])
      setTaxonomy(taxonomyRes.taxonomy)

      if (!token) {
        try {
          const refreshed = await api('/auth/refresh', { method: 'POST' })
          setToken(refreshed.accessToken)
          setUser(refreshed.user)
        } catch {
          // not logged in
        }
      }
    } catch (e) {
      setError(e.message)
    }
  }

  async function refreshAuthedData(nextToken = token) {
    if (!nextToken) return

    const [providersRes, requestsRes, sessionsRes] = await Promise.all([
      api('/providers'),
      api('/requests', { token: nextToken }),
      api('/sessions/me', { token: nextToken }),
    ])

    setProviders(providersRes.providers)
    setRequests(requestsRes.requests)
    setSessions(sessionsRes.sessions)

    if (isProviderMode) {
      const dash = await api('/dashboard/provider', { token: nextToken })
      setProviderDashboard(dash)
    }

    if (isSeekerMode) {
      const dash = await api('/dashboard/seeker', { token: nextToken })
      setSeekerDashboard(dash)
    }
  }

  useEffect(() => {
    bootstrap()
  }, [])

  useEffect(() => {
    if (!token || !user) return

    socket.connect()
    socket.emit('auth:identify', { userId: user.id })

    socket.on('session:created', (session) => {
      setSessions((prev) => [session, ...prev])
    })

    socket.on('message:new', (message) => {
      if (message.sessionId === selectedSessionId) {
        setSessionMessages((prev) => [...prev, message])
      }
    })

    return () => {
      socket.disconnect()
      socket.removeAllListeners()
    }
  }, [token, user, selectedSessionId, socket])

  useEffect(() => {
    if (!selectedSessionId || !token || !user) return

    socket.emit('session:join', { sessionId: selectedSessionId })
    api(`/sessions/${selectedSessionId}/messages`, { token })
      .then((data) => setSessionMessages(data.messages))
      .catch((e) => setError(e.message))
  }, [selectedSessionId, token, socket, user])

  async function handleRegister(e) {
    e.preventDefault()
    setError('')
    try {
      const data = await api('/auth/register', { method: 'POST', body: registerForm })
      setToken(data.accessToken)
      setUser(data.user)
      setActiveTab('onboarding')
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: { email: registerForm.email, password: registerForm.password },
      })
      setToken(data.accessToken)
      setUser(data.user)
      await refreshAuthedData(data.accessToken)
      setActiveTab('marketplace')
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleOnboarding(e) {
    e.preventDefault()
    setError('')

    try {
      const payload = {
        mode: onboardingForm.mode,
        avatarUrl: onboardingForm.avatarUrl,
        skills: onboardingForm.mode === 'seeker' ? [] : [
          {
            category: onboardingForm.category,
            subcategory: onboardingForm.subcategory,
            description: onboardingForm.description,
            hourlyRate: onboardingForm.hourlyRate,
            responseTime: onboardingForm.responseTime,
            availabilityStatus: 'available_now',
          },
        ],
      }

      const data = await api('/onboarding', { method: 'POST', token, body: payload })
      setUser(data.user)
      await refreshAuthedData(token)
      setActiveTab('marketplace')
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleCreateRequest(e) {
    e.preventDefault()
    setError('')

    try {
      await api('/requests', { method: 'POST', token, body: requestForm })
      await refreshAuthedData(token)
      setRequestForm({ ...requestForm, title: '', description: '', budget: '' })
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleApply(requestId) {
    setError('')
    try {
      await api(`/requests/${requestId}/apply`, { method: 'POST', token })
      await refreshAuthedData(token)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleAccept(requestId) {
    setError('')
    try {
      await api(`/requests/${requestId}/accept`, { method: 'POST', token })
      await refreshAuthedData(token)
      setActiveTab('sessions')
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleStartSession(sessionId) {
    setError('')
    try {
      await api(`/sessions/${sessionId}/start`, { method: 'POST', token })
      await refreshAuthedData(token)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleCompleteSession(sessionId) {
    setError('')
    try {
      await api(`/sessions/${sessionId}/complete`, { method: 'POST', token })
      await refreshAuthedData(token)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleSendMessage(e) {
    e.preventDefault()
    setError('')
    if (!selectedSessionId || !messageInput.trim()) return

    try {
      const data = await api(`/sessions/${selectedSessionId}/messages`, {
        method: 'POST',
        token,
        body: { content: messageInput },
      })
      setSessionMessages((prev) => [...prev, data.message])
      setMessageInput('')
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleSubmitReview(e) {
    e.preventDefault()
    setError('')

    try {
      await api('/reviews', { method: 'POST', token, body: reviewForm })
      setReviewForm({ sessionId: '', revieweeId: '', rating: 5, comment: '' })
      await refreshAuthedData(token)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleToggleAvailability(value) {
    setError('')
    try {
      const data = await api('/users/me/availability', {
        method: 'POST',
        token,
        body: { availabilityStatus: value },
      })
      setUser(data.user)
      await refreshAuthedData(token)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl space-y-6 px-4 py-6 md:px-8">
      <header className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">Skill Rent</p>
            <h1 className="text-2xl font-bold">Your skills have value. Rent them now.</h1>
            <p className="mt-2 text-sm text-slate-600">Web MVP phase active. AI and cyber modules are integrated as pluggable service points.</p>
          </div>
          {user ? (
            <div className="text-right text-sm">
              <p className="font-semibold">{user.name}</p>
              <p className="text-slate-500">{user.city}</p>
              <div className="mt-2 flex items-center justify-end gap-2">
                <Badge tone={user.trustScore?.band || 'orange'}>Trust {user.trustScore?.band || 'orange'}</Badge>
                <Badge tone="green">JWT + httpOnly refresh cookie</Badge>
              </div>
            </div>
          ) : null}
        </div>
      </header>

      <section className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap gap-2">
          {['auth', 'onboarding', 'marketplace', 'sessions', 'dashboard'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-xl px-4 py-2 text-sm font-medium ${
                activeTab === tab ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {activeTab === 'auth' ? (
        <section className="grid gap-4 md:grid-cols-2">
          <form onSubmit={handleRegister} className="space-y-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold">Register</h2>
            {['name', 'email', 'password', 'city', 'bio'].map((field) => (
              <input
                key={field}
                type={field === 'password' ? 'password' : 'text'}
                placeholder={field}
                value={registerForm[field]}
                onChange={(e) => setRegisterForm({ ...registerForm, [field]: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
                required
              />
            ))}
            <button className="w-full rounded-lg bg-slate-900 py-2 text-white">Create account</button>
          </form>

          <form onSubmit={handleLogin} className="space-y-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold">Login</h2>
            <p className="text-sm text-slate-500">Use the same email/password fields from register form for quick demo login.</p>
            <button className="w-full rounded-lg bg-emerald-600 py-2 text-white">Login</button>
          </form>
        </section>
      ) : null}

      {activeTab === 'onboarding' ? (
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <form onSubmit={handleOnboarding} className="grid gap-3 md:grid-cols-2">
            <select
              value={onboardingForm.mode}
              onChange={(e) => setOnboardingForm({ ...onboardingForm, mode: e.target.value })}
              className="rounded-lg border border-slate-200 px-3 py-2"
            >
              <option value="provider">Offer skills</option>
              <option value="seeker">Find skills</option>
              <option value="both">Both</option>
            </select>

            <input
              value={onboardingForm.avatarUrl}
              onChange={(e) => setOnboardingForm({ ...onboardingForm, avatarUrl: e.target.value })}
              className="rounded-lg border border-slate-200 px-3 py-2"
              placeholder="Avatar URL (optional)"
            />

            <select
              value={onboardingForm.category}
              onChange={(e) => {
                const category = e.target.value
                const match = taxonomy.find((t) => t.category === category)
                setOnboardingForm({
                  ...onboardingForm,
                  category,
                  subcategory: match?.subcategories?.[0] || '',
                })
              }}
              className="rounded-lg border border-slate-200 px-3 py-2"
            >
              {(taxonomy.length ? taxonomy : [{ category: 'Tech & Development', subcategories: ['Web Development'] }]).map((item) => (
                <option key={item.category} value={item.category}>
                  {item.category}
                </option>
              ))}
            </select>

            <select
              value={onboardingForm.subcategory}
              onChange={(e) => setOnboardingForm({ ...onboardingForm, subcategory: e.target.value })}
              className="rounded-lg border border-slate-200 px-3 py-2"
            >
              {(taxonomy.find((t) => t.category === onboardingForm.category)?.subcategories || []).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <input
              type="number"
              min="1"
              value={onboardingForm.hourlyRate}
              onChange={(e) => setOnboardingForm({ ...onboardingForm, hourlyRate: Number(e.target.value) })}
              className="rounded-lg border border-slate-200 px-3 py-2"
              placeholder="Hourly rate"
            />

            <input
              value={onboardingForm.responseTime}
              onChange={(e) => setOnboardingForm({ ...onboardingForm, responseTime: e.target.value })}
              className="rounded-lg border border-slate-200 px-3 py-2"
              placeholder="Estimated response time"
            />

            <textarea
              value={onboardingForm.description}
              onChange={(e) => setOnboardingForm({ ...onboardingForm, description: e.target.value })}
              className="md:col-span-2 rounded-lg border border-slate-200 px-3 py-2"
              placeholder="Describe your skill (AI verification hook consumes this text)"
            />

            <button className="md:col-span-2 rounded-lg bg-slate-900 py-2 text-white">Complete onboarding</button>
          </form>
        </section>
      ) : null}

      {activeTab === 'marketplace' ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-3 text-lg font-semibold">Available Providers</h2>
              <div className="space-y-3">
                {providers.map((p) => (
                  <article key={p.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">{p.provider?.name || p.userId}</p>
                      <Badge tone="green">Available Now</Badge>
                    </div>
                    <p className="text-sm text-slate-600">{p.category} → {p.subcategory}</p>
                    <p className="text-sm text-slate-600">${p.hourlyRate}/hour · {p.responseTime}</p>
                    <p className="mt-1 text-sm">{p.description}</p>
                    <div className="mt-2 flex gap-2">
                      {p.isVerified ? <Badge tone="green">Verified Skill</Badge> : <Badge>Verification pending</Badge>}
                      <Badge tone="yellow">AI confidence {(p.aiConfidenceScore * 100).toFixed(0)}%</Badge>
                    </div>
                  </article>
                ))}
                {!providers.length ? <p className="text-sm text-slate-500">No providers yet.</p> : null}
              </div>
            </div>

            {isSeekerMode ? (
              <form onSubmit={handleCreateRequest} className="space-y-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <h2 className="text-lg font-semibold">Post a Request</h2>
                <input
                  placeholder="Title"
                  value={requestForm.title}
                  onChange={(e) => setRequestForm({ ...requestForm, title: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  required
                />
                <textarea
                  placeholder="Describe your need"
                  value={requestForm.description}
                  onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  required
                />
                <select
                  value={requestForm.category}
                  onChange={(e) => setRequestForm({ ...requestForm, category: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                >
                  {taxonomy.map((item) => (
                    <option key={item.category} value={item.category}>{item.category}</option>
                  ))}
                </select>
                <input
                  placeholder="Subcategory"
                  value={requestForm.subcategory}
                  onChange={(e) => setRequestForm({ ...requestForm, subcategory: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                />
                <select
                  value={requestForm.urgency}
                  onChange={(e) => setRequestForm({ ...requestForm, urgency: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                >
                  {urgencyOptions.map((item) => <option key={item}>{item}</option>)}
                </select>
                <input
                  placeholder="Budget (optional)"
                  value={requestForm.budget}
                  onChange={(e) => setRequestForm({ ...requestForm, budget: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                />
                <button className="w-full rounded-lg bg-slate-900 py-2 text-white">Publish request</button>
              </form>
            ) : null}
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-3 text-lg font-semibold">Open Requests</h2>
            <div className="space-y-3">
              {requests.map((reqItem) => (
                <article key={reqItem.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{reqItem.title}</p>
                    <Badge tone="orange">{reqItem.urgency}</Badge>
                  </div>
                  <p className="text-sm text-slate-600">{reqItem.category} · {reqItem.subcategory}</p>
                  <p className="text-sm">{reqItem.description}</p>
                  <p className="mt-1 text-xs text-slate-500">Smart matching ready (AI placeholder active)</p>
                  <div className="mt-2 flex gap-2">
                    {isProviderMode ? (
                      <>
                        <button onClick={() => handleApply(reqItem.id)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm">
                          Apply
                        </button>
                        <button onClick={() => handleAccept(reqItem.id)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white">
                          Accept & create session
                        </button>
                      </>
                    ) : null}
                  </div>
                </article>
              ))}
              {!requests.length ? <p className="text-sm text-slate-500">No requests yet.</p> : null}
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === 'sessions' ? (
        <section className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <aside className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-3 text-lg font-semibold">Your Sessions</h2>
            <div className="space-y-2">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSessionId(s.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left ${selectedSessionId === s.id ? 'border-slate-900' : 'border-slate-200'}`}
                >
                  <p className="text-sm font-semibold">{s.id}</p>
                  <p className="text-xs text-slate-500">{s.status} · {new Date(s.scheduledStart).toLocaleString()}</p>
                </button>
              ))}
              {!sessions.length ? <p className="text-sm text-slate-500">No sessions yet.</p> : null}
            </div>
          </aside>

          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">Session Controls</h2>
                {selectedSession ? <Badge tone={selectedSession.protectedMode ? 'green' : 'slate'}>{selectedSession.protectedMode ? 'Protected Mode ON' : 'Protected Mode OFF'}</Badge> : null}
              </div>
              {selectedSession ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => handleStartSession(selectedSession.id)} className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white">Start</button>
                  <button onClick={() => handleCompleteSession(selectedSession.id)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white">Complete (seeker)</button>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">Select a session first.</p>
              )}
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-3 text-lg font-semibold">Session Chat (session-scoped only)</h2>
              <div className="h-64 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
                {sessionMessages.map((m) => (
                  <div key={m.id} className="rounded-lg bg-slate-50 p-2 text-sm">
                    <p>{m.content}</p>
                    <p className="text-xs text-slate-500">{m.senderId} · {new Date(m.createdAt).toLocaleTimeString()}</p>
                    {m.isFlagged ? <Badge tone="orange">Flagged</Badge> : null}
                  </div>
                ))}
                {!sessionMessages.length ? <p className="text-sm text-slate-500">No messages yet.</p> : null}
              </div>
              <form onSubmit={handleSendMessage} className="mt-2 flex gap-2">
                <input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type message"
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2"
                />
                <button className="rounded-lg bg-slate-900 px-4 py-2 text-white">Send</button>
              </form>
              <p className="mt-2 text-xs text-slate-500">Payment links are blocked during protected sessions.</p>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-lg font-semibold">Mutual Review</h2>
              <input
                value={reviewForm.sessionId}
                onChange={(e) => setReviewForm({ ...reviewForm, sessionId: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
                placeholder="Session ID"
                required
              />
              <input
                value={reviewForm.revieweeId}
                onChange={(e) => setReviewForm({ ...reviewForm, revieweeId: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
                placeholder="Reviewee user ID"
                required
              />
              <input
                type="number"
                min="1"
                max="5"
                value={reviewForm.rating}
                onChange={(e) => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
              />
              <textarea
                value={reviewForm.comment}
                onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
                placeholder="Review comment"
              />
              <button className="w-full rounded-lg bg-slate-900 py-2 text-white">Submit review</button>
            </form>
          </div>
        </section>
      ) : null}

      {activeTab === 'dashboard' ? (
        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold">Provider Dashboard</h2>
            {providerDashboard ? (
              <ul className="mt-2 space-y-1 text-sm">
                <li>Total earnings: ${providerDashboard.totalEarnings}</li>
                <li>Sessions completed: {providerDashboard.sessionsCompleted}</li>
                <li>Average rating: {providerDashboard.averageRating.toFixed(2)}</li>
                <li>Pending requests: {providerDashboard.pendingRequests}</li>
                <li>Availability: {providerDashboard.currentAvailability}</li>
              </ul>
            ) : <p className="mt-2 text-sm text-slate-500">No provider metrics yet.</p>}

            <div className="mt-3 flex gap-2">
              <button onClick={() => handleToggleAvailability('available_now')} className="rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white">Available now</button>
              <button onClick={() => handleToggleAvailability('busy')} className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm text-white">Busy</button>
              <button onClick={() => handleToggleAvailability('offline')} className="rounded-lg bg-slate-600 px-3 py-1.5 text-sm text-white">Offline</button>
            </div>
          </article>

          <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold">Seeker Dashboard</h2>
            {seekerDashboard ? (
              <ul className="mt-2 space-y-1 text-sm">
                <li>Active sessions: {seekerDashboard.activeSessions.length}</li>
                <li>Past sessions: {seekerDashboard.pastSessions.length}</li>
                <li>Total spending: ${seekerDashboard.spendingSummary}</li>
                <li>Favorite providers: {seekerDashboard.favoriteProviders.length}</li>
              </ul>
            ) : <p className="mt-2 text-sm text-slate-500">No seeker metrics yet.</p>}
          </article>
        </section>
      ) : null}
    </main>
  )
}

export default App

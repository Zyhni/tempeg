import { useEffect, useState, useRef } from "react";
function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function Home() {
  const sanitize = (str) => {
    if (!str || typeof str !== "string") return "";
    return str
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [inbox, setInbox] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const [loadingGen, setLoadingGen] = useState(false);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef(null);
  const handleGenerate = async () => {
    if (cooldown > 0) return;

    setCooldown(10);

    const interval = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    await generateEmail();
  };
  
  // ---- NEW: device ID ----
  const [deviceID, setDeviceID] = useState(null);

  useEffect(() => {
    // load or generate device ID
    let dID = localStorage.getItem("tempeg-device-id");
    if (!dID) {
      dID = "dev-" + Math.random().toString(36).substring(2) + Date.now();
      localStorage.setItem("tempeg-device-id", dID);
    }
    setDeviceID(dID);

    // load main history
    const rawHistory = localStorage.getItem("tempeg-history");
    if (rawHistory) setHistory(JSON.parse(rawHistory));

    // load device-specific history
    const devHistory = localStorage.getItem("tempeg-history-" + dID);
    if (devHistory) {
      const parsed = JSON.parse(devHistory);
      if (Array.isArray(parsed)) {
        setHistory(parsed);
      }
    }

    // load last result
    const last = localStorage.getItem("tempeg-last-result");
    if (last) setResult(JSON.parse(last));
  }, []);

  // auto-save history
  useEffect(() => {
    if (!deviceID) return;
    localStorage.setItem("tempeg-history", JSON.stringify(history));
    localStorage.setItem("tempeg-history-" + deviceID, JSON.stringify(history));
  }, [history, deviceID]);

  // auto-save last result
  useEffect(() => {
    if (result) localStorage.setItem("tempeg-last-result", JSON.stringify(result));
    else localStorage.removeItem("tempeg-last-result");
  }, [result]);

  const isExpired = (iso) => {
    if (!iso) return false;
    const t = Date.parse(iso);
    if (Number.isNaN(t)) return false;
    return Date.now() > t;
  };

  const generateEmail = async () => {
    setLoadingGen(true);
    setInbox(null);
    try {
      const res = await fetch("/api/tempmail");
      const json = await res.json();
      const payload = json.data || json;
      const data = payload.data || payload;

      const record = {
        id: data.id || null,
        email: (data.addresses && data.addresses[0] && data.addresses[0].address) || data.address || null,
        expiresAt: data.expiresAt || data.expires || null,
        createdAt: new Date().toISOString(),
        deviceID // NEW SYSTEM
      };

      setResult(record);

      setHistory(prev => {
        const next = [record, ...prev.filter(h => h.id !== record.id)].slice(0, 100);
        return next;
      });

      localStorage.setItem("tempeg-last-id", record.id || "");
    } catch (err) {
      console.error("generate error", err);
      alert("Generate gagal: " + (err.message || err));
    } finally {
      setLoadingGen(false);
    }
  };

  const fetchInbox = async ({ id } = {}) => {
    setLoadingInbox(true);
    setInbox(null);
    try {
      if (!id) throw new Error("id required");
      const res = await fetch(`/api/inbox?id=${encodeURIComponent(id)}`);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt}`);
      }
      const json = await res.json();

      const mails = (json?.data?.mails && Array.isArray(json.data.mails))
        ? json.data.mails
        : Array.isArray(json.mails)
          ? json.mails
          : [];

      const parsed = (mails || []).map(m => ({
        to: m.toAddr || m.to || "",
        from: m.fromAddr || m.from || m.sender || "",
        subject: m.headerSubject || m.subject || m.title || "(no subject)",
        body: m.text || m.body || m.content || "",
        downloadUrl: m.downloadUrl || m.download || null,
        raw: m
      }));

      setInbox({ raw: json, messages: parsed });
      return { messages: parsed, raw: json };
    } catch (err) {
      console.error("fetchInbox error", err);
      setInbox({ raw: { error: err.message }, messages: [] });
      return { messages: [], raw: { error: err.message } };
    } finally {
      setLoadingInbox(false);
    }
  };

  const handleCheckInboxCurrent = async () => {
    if (!result || !result.id) return alert("Generate dulu email-nya");
    if (isExpired(result.expiresAt)) return alert("Email sudah expired, generate baru");
    await fetchInbox({ id: result.id });
  };

  const handleCheckInboxHistory = async (item) => {
    if (!item || !item.id) return alert("History item invalid");
    if (item.expiresAt && isExpired(item.expiresAt)) return alert("History item sudah expired");
    setResult(item);
    await fetchInbox({ id: item.id });
  };

  const startPolling = (idToPoll) => {
    if (!idToPoll) return alert("ID diperlukan untuk polling");
    if (pollRef.current) clearInterval(pollRef.current);
    setPolling(true);
    fetchInbox({ id: idToPoll });

    pollRef.current = setInterval(async () => {
      const r = await fetchInbox({ id: idToPoll });
      if (r.messages && r.messages.length > 0) stopPolling();
    }, 5000);
  };

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    setPolling(false);
  };

  return (
    <div className="gothic-bg">
      <div className="gothic-container">
        <header className="gothic-header">
          <div className="gothic-brand">
            <div className="gothic-logo">T</div>
            <div>
              <h1 className="gothic-title">TEMPEG</h1>
              <div className="gothic-sub">Temporary Email Generator</div>
            </div>
          </div>

          <div className="gothic-status">
            <div className={`goth-badge ${result ? 'goth-ready' : 'goth-warn'}`}>
              {result ? 'Ready' : 'No email'}
            </div>
            <button
              className="goth-link"
              onClick={() => {
                localStorage.removeItem("tempeg-history");
                localStorage.removeItem("tempeg-history-" + deviceID);
                localStorage.removeItem("tempeg-last-result");
                setHistory([]);
                setResult(null);
                setInbox(null);
              }}
            >
              Reset
            </button>
          </div>
        </header>

        <main className="goth-grid">
          <section className="goth-main">
            <div className="goth-panel">
              <div>
                <h2 className="panel-title">Create temporary email</h2>
              </div>

              <div>
                <button
                  className="btn goth-primary" disabled={cooldown > 0} onClick={handleGenerate}>
                  {cooldown > 0 ? `Waiting ${cooldown}s` : "Generate Email"}
                </button>
              </div>
            </div>

            {result && (
              <div className="goth-card result">
                <div className="result-info">
                  <div className="label">Email</div>
                  <div className="val break">{sanitize(result.email)}</div>

                  <div className="label mt">ID</div>
                  <div className="val mono break">{result.id}</div>

                  <div className="label mt">Expires</div>
                    <div className={`val ${isExpired(result.expiresAt) ? 'expired' : 'danger'}`}>
                        {formatDate(result.expiresAt)}
                    </div>
                </div>

                <div className="result-controls">
                  <button className="btn goth-success" onClick={handleCheckInboxCurrent} disabled={loadingInbox}>
                    {loadingInbox ? <span className="goth-spinner small" /> : 'Check Inbox'}
                  </button>

                  <button className={`btn goth-ghost ${polling ? 'active' : ''}`} onClick={() => polling ? stopPolling() : startPolling(result.id)}>
                    {polling ? 'Stop Polling' : 'Start Polling (5s)'}
                  </button>

                  <button className="btn goth-outline" onClick={() => { navigator.clipboard?.writeText(result.email); alert('Email copied') }}>
                    Copy Email
                  </button>
                </div>
              </div>
            )}

            <div className="goth-card inbox">
              <div className="card-head">
                <h3>Inbox</h3>
                <div className="muted">Messages: <strong>{inbox ? inbox.messages.length : 0}</strong></div>
              </div>

              <div className="card-body">
                {inbox ? (
                  inbox.messages.length === 0 ? (
                    <div className="empty">Belum ada pesan. Klik <strong>Check Inbox</strong> atau aktifkan polling.</div>
                  ) : (
                    <div className="messages">
                      {inbox.messages.map((m, i) => (
                        <article className="message" key={i}>
                          <div className="message-head">
                            <div>
                              <div className="msg-from">{sanitize(m.from)}</div>
                             <div className="msg-sub">{sanitize(m.subject)}</div>
                            </div>
                            <div className="msg-to mono">{m.to}</div>
                          </div>
                         <div className="msg-body">{sanitize(m.body)}</div>
                          {m.downloadUrl && (
                            <a className="goth-link" href={m.downloadUrl} target="_blank" rel="noreferrer">Download attachment</a>
                          )}
                        </article>
                      ))}
                    </div>
                  )
                ) : (
                  <div className="empty">Klik tombol <strong>Check Inbox</strong> untuk menampilkan pesan.</div>
                )}
              </div>
            </div>
          </section>

          <aside className="goth-side">
            <div className="goth-card">
              <div className="card-head">
                <h3>History</h3>
                <div className="muted">{history.length} saved</div>
              </div>

              <div className="history-list">
                {history.length === 0 && <div className="empty">Belum ada history.</div>}
                {history.map((h, idx) => {
                const expired = isExpired(h.expiresAt);
                return (
                    <div key={h.id + "-" + idx} className={`history-item ${expired ? 'expired' : ''}`}>
                    <div className="h-left">
                        <div className="h-email break">{sanitize(h.email)}</div>
                        <div className="h-id mono">{sanitize(h.id)}</div>
                        <div className={`muted small ${expired ? 'expired-text' : ''}`}>
                        Expires: {formatDate(h.expiresAt)}
                        </div>
                    </div>
                    <div className="h-actions">
                        <button 
                        className={`btn small ${expired ? 'disabled' : 'goth-success'}`} 
                        onClick={() => handleCheckInboxHistory(h)} 
                        disabled={expired}
                        >
                        {expired ? 'Expired' : 'Check Inbox'}
                        </button>
                        <button className="btn small goth-outline" onClick={() => { navigator.clipboard?.writeText(h.email); alert('Copied') }}>
                        Copy
                        </button>
                    </div>
                    </div>
                );
                })}
              </div>
            </div>

            <div className="goth-card tips">
              <h4>Tips</h4>
              <ul>
                <li>Gunakan polling untuk auto-check setiap 5 detik.</li>
                <li>Gunakan tombol "Check Inbox" untuk manual check.</li>
              </ul>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}

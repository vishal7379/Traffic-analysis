import { useState } from "react";
import UploadBox from "./components/UploadBox";
import TrafficCard from "./components/TrafficCard";
import MapView from "./components/MapView";
import SignalTimer from "./components/SignalTimer";
import AlertBanner from "./components/AlertBanner";
import "./App.css";

function App() {
  const [result, setResult] = useState(null);
  const [lat, setLat] = useState("18.9388");
  const [lng, setLng] = useState("72.8257");
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [logs, setLogs] = useState([]);
  const [alert, setAlert] = useState(null);

  const checkCongestionAlert = (newLogs) => {
    if (newLogs.length >= 3) {
      const recent = newLogs.slice(0, 3);
      if (recent.every((l) => l.level === "HIGH")) {
        setAlert({
          message: "Persistent HIGH congestion detected at this junction!",
          sub: "Recommend signal priority adjustment and traffic personnel deployment.",
        });
      } else {
        setAlert(null);
      }
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(
        `http://localhost:8000/predict?lat=${lat}&lng=${lng}`,
        { method: "POST", body: formData }
      );
      const data = await res.json();
      setResult(data);

      const now = new Date();
      const time = now.toTimeString().slice(0, 8);
      const newEntry = {
        time,
        count: data.vehicle_count,
        level: data.traffic_level,
        lat: data.lat,
        lng: data.lng,
        score: data.congestion_score,
      };

      setLogs((prev) => {
        const updated = [newEntry, ...prev.slice(0, 9)];
        checkCongestionAlert(updated);
        return updated;
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude.toString());
          setLng(pos.coords.longitude.toString());
        },
        () => alert("Unable to get location. Check browser permissions.")
      );
    } else {
      alert("Geolocation not supported.");
    }
  };

  const handleExport = () => {
    if (logs.length === 0) return;
    const header = "Time,Latitude,Longitude,Vehicle Count,Traffic Level,Congestion Score,Green Duration\n";
    const rows = logs.map((l) => {
      const signal = l.level === "LOW" ? 30 : l.level === "MEDIUM" ? 60 : 90;
      return `${l.time},${l.lat},${l.lng},${l.count},${l.level},${l.score},${signal}s`;
    });
    const csv = header + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `traffic_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <div className="logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M3 12h4l3-8 4 16 3-8h4" />
            </svg>
          </div>
          <div>
            <div className="logo-text">Traffic Analyzer</div>
            <div className="logo-sub">Adaptive Signal Management System</div>
          </div>
        </div>
        <div className="header-right">
          <div className="status-bar">
            <div className="status-dot" />
            <div className="status-text">MODEL ACTIVE · LIVE</div>
          </div>
          <button
            className="export-btn"
            onClick={handleExport}
            disabled={logs.length === 0}
            title="Export CSV report"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Export Report
          </button>
        </div>
      </header>

      {alert && (
        <AlertBanner message={alert.message} sub={alert.sub} onClose={() => setAlert(null)} />
      )}

      <main className="main">
        <div className="left-panel">
          <div>
            <div className="section-label">Input</div>
            <UploadBox onFileSelect={setFile} />
          </div>

          <div>
            <div className="section-label">Location</div>
            <div className="coords-grid">
              <div className="field-group">
                <label className="field-label">Latitude</label>
                <input className="field-input" value={lat} onChange={(e) => setLat(e.target.value)} />
              </div>
              <div className="field-group">
                <label className="field-label">Longitude</label>
                <input className="field-input" value={lng} onChange={(e) => setLng(e.target.value)} />
              </div>
            </div>
            <button className="location-btn" onClick={handleGetCurrentLocation}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
              </svg>
              Get Current Location
            </button>
          </div>

          <MapView
            lat={parseFloat(lat) || 0}
            lng={parseFloat(lng) || 0}
            logs={logs}
          />

          <button
            className={`analyze-btn ${loading ? "analyze-btn--loading" : ""}`}
            onClick={handleAnalyze}
            disabled={loading || !file}
          >
            {loading ? (
              <><span className="spinner" />Analyzing...</>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                Analyze Traffic
              </>
            )}
          </button>
        </div>

        <div className="right-panel">
          <div>
            <div className="section-label">Analysis Results</div>
            <TrafficCard result={result} />
          </div>

          {result?.signal_recommendation && (
            <div>
              <div className="section-label">Signal Recommendation</div>
              <SignalTimer recommendation={result.signal_recommendation} level={result.traffic_level} />
            </div>
          )}

          <div>
            <div className="section-label">
              Recent Logs
              {logs.length > 0 && <span className="log-count">{logs.length} entries</span>}
            </div>
            <div className="results-card logs-card">
              {logs.length === 0 ? (
                <p className="no-logs">No analyses yet. Upload an image and click Analyze.</p>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="log-row">
                    <span className={`log-time ${i === 0 ? "log-time--active" : ""}`}>{log.time}</span>
                    <span className="log-text">
                      {log.count} vehicles ·{" "}
                      <span className={`log-level log-level--${log.level.toLowerCase()}`}>{log.level}</span>
                    </span>
                    <div className="log-bar-wrap">
                      <div
                        className={`log-bar log-bar--${log.level.toLowerCase()}`}
                        style={{ width: `${log.score}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
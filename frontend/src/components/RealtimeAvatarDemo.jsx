import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { socket } from "../socket";
import OfficeCanvas from "./OfficeCanvas";
import { createSpatialAudioManager } from "../utils/spatialAudioManager";
import { calculateDistance, calculateVolume } from "../utils/spatialAudio";

const OFFICE_WIDTH = 800;
const OFFICE_HEIGHT = 500;
const AVATAR_SIZE = 24;
const MOVEMENT_SPEED = 200;
const MAX_AUDIO_DISTANCE = 300; // Spatial audio range (coordinate units)

const MOVEMENT_KEYS = [
  "w", "a", "s", "d",
  "arrowup", "arrowdown", "arrowleft", "arrowright",
];

// ICE servers for WebRTC NAT traversal (STUN only — no TURN needed for LAN)
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export default function RealtimeAvatarDemo() {
  // ─── Identity ────────────────────────────────────────────────────────────
  const [userId, setUserId] = useState(() => {
    let stored = sessionStorage.getItem("proxispeak_uid");
    if (!stored) {
      stored = `user_${Math.floor(100 + Math.random() * 900)}`;
      sessionStorage.setItem("proxispeak_uid", stored);
    }
    return stored;
  });

  const officeId = "office_1";

  // ─── Local avatar position ────────────────────────────────────────────────
  const [position, setPosition] = useState({
    x: 100 + Math.floor(Math.random() * 200),
    y: 100 + Math.floor(Math.random() * 150),
  });
  const positionRef = useRef(position);
  positionRef.current = position;
  const lastMouseEmitRef = useRef({ x: position.x, y: position.y });

  // ─── Presence state ──────────────────────────────────────────────────────
  const [connected, setConnected] = useState(false);
  const [users, setUsers] = useState([]);
  const usersRef = useRef([]);
  usersRef.current = users;

  // ─── Microphone / local stream ────────────────────────────────────────────
  const [micActive, setMicActive] = useState(false);
  const [micError, setMicError] = useState(null);
  const localStreamRef = useRef(null);

  // ─── WebRTC peer connections (one per remote user) ────────────────────────
  // Map<userId, RTCPeerConnection>
  const peersRef = useRef(new Map());

  // ─── Spatial audio manager (one shared AudioContext, per-user GainNodes) ──
  const audioManager = useMemo(() => createSpatialAudioManager(), []);

  // ─── Spatial audio debug state (for demo panel) ─────────────────────────
  const [audioDebug, setAudioDebug] = useState({}); // { [userId]: { distance, volume, connected } }

  // ─── Refs ─────────────────────────────────────────────────────────────────
  const audioManagerRef = useRef(audioManager);
  audioManagerRef.current = audioManager;

  // Cache to avoid unnecessary volume updates when positions haven't changed (Step 3)
  const lastVolumeUpdateRef = useRef(new Map()); // Map<userId, { localX, localY, remoteX, remoteY, distance, volume }>

  // Member 3's volume update function wrapper (Step 2)
  const updateRemoteVolume = useCallback((remoteUserId, volume) => {
    if (audioManagerRef.current) {
      if (typeof audioManagerRef.current.updateRemoteVolume === "function") {
        audioManagerRef.current.updateRemoteVolume(remoteUserId, volume);
      } else if (typeof audioManagerRef.current.setGain === "function") {
        audioManagerRef.current.setGain(remoteUserId, volume);
      }
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase 5 — Dynamic distance attenuation (Member 4)
  // ═══════════════════════════════════════════════════════════════════════════
  const updateAllGains = useCallback((localPos, currentUsers) => {
    const debugSnapshot = {};
    const lastUpdates = lastVolumeUpdateRef.current;

    currentUsers.forEach((remoteUser) => {
      if (remoteUser.userId === userId) return; // skip self

      const prev = lastUpdates.get(remoteUser.userId);
      const isUnchanged =
        prev &&
        prev.localX === localPos.x &&
        prev.localY === localPos.y &&
        prev.remoteX === remoteUser.x &&
        prev.remoteY === remoteUser.y;

      let distance;
      let volume;

      if (isUnchanged) {
        // Step 3: Avoid unnecessary updates when coordinates are unchanged
        distance = prev.distance;
        volume = prev.volume;
      } else {
        // Step 2: Get positions, compute pixel distance and dynamic attenuation
        distance = calculateDistance(localPos, remoteUser);
        volume = calculateVolume(distance, MAX_AUDIO_DISTANCE);

        // Step 2 & 3: Pass volume to Member 3's updateRemoteVolume with smooth setTargetAtTime
        updateRemoteVolume(remoteUser.userId, volume);

        lastUpdates.set(remoteUser.userId, {
          localX: localPos.x,
          localY: localPos.y,
          remoteX: remoteUser.x,
          remoteY: remoteUser.y,
          distance,
          volume,
        });
      }

      const entry = audioManagerRef.current.getAudioEntry(remoteUser.userId);
      debugSnapshot[remoteUser.userId] = {
        distance: Math.round(distance),
        volume: parseFloat(volume.toFixed(3)),
        audioConnected: !!entry,
        name: remoteUser.name || remoteUser.userId,
      };
    });

    setAudioDebug(debugSnapshot);
  }, [userId, updateRemoteVolume]);

  // ─── Re-run gain calculation whenever position or users change ────────────
  useEffect(() => {
    updateAllGains(position, users);
  }, [position, users, updateAllGains]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase 4 — WebRTC: peer connection factory
  // ═══════════════════════════════════════════════════════════════════════════
  const createPeerConnection = useCallback((remoteUserId) => {
    if (peersRef.current.has(remoteUserId)) {
      return peersRef.current.get(remoteUserId);
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add local tracks to outbound stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Handle incoming remote audio track
    pc.ontrack = (event) => {
      const stream = event.streams?.[0];
      if (!stream) return;

      audioManagerRef.current.connectRemoteStream(remoteUserId, stream);
      audioManagerRef.current.ensureResumed();

      // Immediately apply the current distance-based gain (Step 2)
      const localPos = positionRef.current;
      const remoteUser = usersRef.current.find((u) => u.userId === remoteUserId);
      if (remoteUser) {
        const distance = calculateDistance(localPos, remoteUser);
        const volume = calculateVolume(distance, MAX_AUDIO_DISTANCE);
        updateRemoteVolume(remoteUserId, volume);
      }

      // Force debug panel refresh
      setAudioDebug((prev) => ({
        ...prev,
        [remoteUserId]: {
          ...(prev[remoteUserId] || {}),
          audioConnected: true,
        },
      }));
    };

    // Relay ICE candidates through Socket.IO
    pc.onicecandidate = (event) => {
      if (event.candidate && socket.connected) {
        socket.emit("webrtc:ice-candidate", {
          targetUserId: remoteUserId,
          candidate: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log(`[WebRTC] Peer ${remoteUserId}: ${state}`);

      if (state === "failed" || state === "closed") {
        cleanupPeer(remoteUserId);
      }
    };

    peersRef.current.set(remoteUserId, pc);
    return pc;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cleanupPeer = useCallback((remoteUserId) => {
    const pc = peersRef.current.get(remoteUserId);
    if (pc) {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      pc.close();
      peersRef.current.delete(remoteUserId);
    }
    audioManagerRef.current.disconnectUser(remoteUserId);
  }, []);

  // ─── Initiate call to a new peer (polite/impolite is simplified: ──────────
  // the user with the lexicographically smaller ID sends the offer)
  const initiateCall = useCallback(async (remoteUserId) => {
    if (!localStreamRef.current) return;
    if (userId >= remoteUserId) return; // let the "smaller" ID initiate

    try {
      const pc = createPeerConnection(remoteUserId);
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);

      socket.emit("webrtc:offer", {
        targetUserId: remoteUserId,
        offer: pc.localDescription,
      });
    } catch (err) {
      console.error("[WebRTC] Offer creation failed:", err.message);
    }
  }, [userId, createPeerConnection]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Microphone capture
  // ═══════════════════════════════════════════════════════════════════════════
  const startMicrophone = useCallback(async () => {
    if (localStreamRef.current) return; // already active

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      localStreamRef.current = stream;
      setMicActive(true);
      setMicError(null);

      // Resume AudioContext now that a user gesture has occurred
      audioManagerRef.current.ensureResumed();

      // Add tracks to any already-established peer connections
      peersRef.current.forEach((pc) => {
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });
      });
    } catch (err) {
      setMicError(err.message || "Microphone access denied");
    }
  }, []);

  const stopMicrophone = useCallback(() => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setMicActive(false);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // Socket.IO: presence + WebRTC signaling
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    function handleConnect() {
      setConnected(true);
      socket.emit("user:join", {
        userId,
        officeId,
        x: positionRef.current.x,
        y: positionRef.current.y,
      });
    }

    function handleDisconnect() {
      setConnected(false);
    }

    function handlePresenceUpdate(data) {
      const incomingUsers = Array.isArray(data)
        ? data
        : Array.isArray(data?.users)
          ? data.users
          : [];

      const currentUsers = usersRef.current;
      const userMap = new Map(currentUsers.map((u) => [u.userId, u]));
      const newRemotes = [];

      incomingUsers.forEach((u) => {
        if (u && typeof u.userId === "string" && Number.isFinite(u.x) && Number.isFinite(u.y)) {
          if (!userMap.has(u.userId) && u.userId !== userId) {
            newRemotes.push(u.userId);
          }
          userMap.set(u.userId, {
            ...userMap.get(u.userId),
            ...u,
            name: u.userId === userId ? "You" : u.userId,
          });
        }
      });

      setUsers(Array.from(userMap.values()));

      // Initiate WebRTC calls to newly discovered peers outside state updater
      newRemotes.forEach((remoteUserId) => {
        initiateCall(remoteUserId);
      });
    }

    function handleDuplicateUser() {
      console.warn("[ProxiSpeak] Duplicate user detected. Assigning fresh unique user ID...");
      const newId = `user_${Math.floor(100 + Math.random() * 900)}`;
      sessionStorage.setItem("proxispeak_uid", newId);
      setUserId(newId);
    }

    function handleUserLeft(data) {
      const leftUserId = typeof data === "string" ? data : data?.userId;
      if (!leftUserId) return;

      setUsers((prev) => prev.filter((u) => u.userId !== leftUserId));
      lastVolumeUpdateRef.current.delete(leftUserId);
      cleanupPeer(leftUserId);
    }

    // WebRTC signaling handlers
    async function handleWebRtcOffer({ fromUserId, offer }) {
      try {
        const pc = createPeerConnection(fromUserId);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("webrtc:answer", {
          targetUserId: fromUserId,
          answer: pc.localDescription,
        });
      } catch (err) {
        console.error("[WebRTC] Answer creation failed:", err.message);
      }
    }

    async function handleWebRtcAnswer({ fromUserId, answer }) {
      const pc = peersRef.current.get(fromUserId);
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (err) {
        console.error("[WebRTC] Set remote answer failed:", err.message);
      }
    }

    async function handleIceCandidate({ fromUserId, candidate }) {
      const pc = peersRef.current.get(fromUserId);
      if (!pc) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn("[WebRTC] ICE candidate error:", err.message);
      }
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("presence:update", handlePresenceUpdate);
    socket.on("user:left", handleUserLeft);
    socket.on("webrtc:offer", handleWebRtcOffer);
    socket.on("webrtc:answer", handleWebRtcAnswer);
    socket.on("webrtc:ice-candidate", handleIceCandidate);
    socket.on("error:duplicate_user", handleDuplicateUser);

    if (socket.connected) {
      handleConnect();
    } else {
      socket.connect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("presence:update", handlePresenceUpdate);
      socket.off("user:left", handleUserLeft);
      socket.off("webrtc:offer", handleWebRtcOffer);
      socket.off("webrtc:answer", handleWebRtcAnswer);
      socket.off("webrtc:ice-candidate", handleIceCandidate);
      socket.off("error:duplicate_user", handleDuplicateUser);
      socket.disconnect();
    };
  }, [userId, officeId, createPeerConnection, cleanupPeer, initiateCall]);

  // ─── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      peersRef.current.forEach((_, remoteUserId) => cleanupPeer(remoteUserId));
      stopMicrophone();
      audioManagerRef.current.destroy();
    };
  }, [cleanupPeer, stopMicrophone]);

  // ─── Sync own avatar into the users array ─────────────────────────────────
  useEffect(() => {
    setUsers((prevUsers) => {
      const exists = prevUsers.some((u) => u.userId === userId);
      if (!exists) {
        return [...prevUsers, { userId, name: "You", x: position.x, y: position.y }];
      }
      return prevUsers.map((u) =>
        u.userId === userId ? { ...u, x: position.x, y: position.y } : u
      );
    });
  }, [position, userId]);

  // ─── Mouse / pointer drag movement ────────────────────────────────────────
  const handleMoveAvatar = useCallback(
    (newX, newY) => {
      const clampedX = Math.max(0, Math.min(OFFICE_WIDTH - AVATAR_SIZE, newX));
      const clampedY = Math.max(0, Math.min(OFFICE_HEIGHT - AVATAR_SIZE, newY));

      setPosition({ x: clampedX, y: clampedY });

      const last = lastMouseEmitRef.current;
      if (
        socket.connected &&
        (Math.abs(clampedX - last.x) >= 2 || Math.abs(clampedY - last.y) >= 2)
      ) {
        socket.emit("avatar:move", {
          userId,
          officeId,
          x: Math.round(clampedX),
          y: Math.round(clampedY),
        });
        lastMouseEmitRef.current = { x: clampedX, y: clampedY };
      }

      // Resume AudioContext on any pointer interaction
      audioManagerRef.current.ensureResumed();
    },
    [userId, officeId]
  );

  // ─── Keyboard movement ───────────────────────────────────────────────────
  useEffect(() => {
    const keysPressed = new Set();
    let animFrameId;
    let prevTime = 0;
    let lastSent = { x: position.x, y: position.y };

    function handleKeyDown(e) {
      const key = e.key.toLowerCase();
      if (!MOVEMENT_KEYS.includes(key)) return;
      e.preventDefault();
      keysPressed.add(key);
      audioManagerRef.current.ensureResumed();
    }

    function handleKeyUp(e) {
      keysPressed.delete(e.key.toLowerCase());
    }

    function handleBlur() {
      keysPressed.clear();
    }

    function loop(time) {
      if (prevTime === 0) prevTime = time;
      const delta = Math.min((time - prevTime) / 1000, 0.05);
      prevTime = time;

      let dx = 0;
      let dy = 0;

      if (keysPressed.has("w") || keysPressed.has("arrowup"))    dy -= 1;
      if (keysPressed.has("s") || keysPressed.has("arrowdown"))  dy += 1;
      if (keysPressed.has("a") || keysPressed.has("arrowleft"))  dx -= 1;
      if (keysPressed.has("d") || keysPressed.has("arrowright")) dx += 1;

      if (dx !== 0 || dy !== 0) {
        const len = Math.sqrt(dx * dx + dy * dy);
        dx /= len;
        dy /= len;

        const moveX = dx * MOVEMENT_SPEED * delta;
        const moveY = dy * MOVEMENT_SPEED * delta;

        setPosition((curr) => {
          const next = {
            x: Math.max(0, Math.min(OFFICE_WIDTH - AVATAR_SIZE, curr.x + moveX)),
            y: Math.max(0, Math.min(OFFICE_HEIGHT - AVATAR_SIZE, curr.y + moveY)),
          };

          if (
            socket.connected &&
            (Math.abs(next.x - lastSent.x) >= 2 || Math.abs(next.y - lastSent.y) >= 2)
          ) {
            socket.emit("avatar:move", {
              userId,
              officeId,
              x: Math.round(next.x),
              y: Math.round(next.y),
            });
            lastSent = { x: next.x, y: next.y };
          }

          return next;
        });
      }

      animFrameId = requestAnimationFrame(loop);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    animFrameId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
      cancelAnimationFrame(animFrameId);
    };
  }, [userId, officeId]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════════════
  const remoteUsers = users.filter((u) => u.userId !== userId);

  return (
    <main
      style={{
        padding: 24,
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        maxWidth: 900,
        margin: "0 auto",
        color: "#f1f5f9",
        background: "#0b0f19",
        minHeight: "100vh",
      }}
    >
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#38bdf8" }}>
          ProxiSpeak — Geospatial Office Multiplayer
        </h1>
        <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>
          Real-time movement broadcast · Spatial audio · MongoDB Atlas persistence
        </p>
      </header>

      {/* Status Bar */}
      <div
        style={{
          display: "flex",
          gap: 16,
          alignItems: "center",
          flexWrap: "wrap",
          background: "#1e293b",
          padding: "10px 16px",
          borderRadius: 8,
          marginBottom: 16,
          fontSize: 13,
          border: "1px solid #334155",
        }}
      >
        <div>
          Status:{" "}
          <strong style={{ color: connected ? "#4ade80" : "#f87171" }}>
            {connected ? "● Connected to Atlas" : "○ Disconnected"}
          </strong>
        </div>
        <div>
          Office: <strong style={{ color: "#e2e8f0" }}>{officeId}</strong>
        </div>
        <div>
          Your ID: <strong style={{ color: "#38bdf8" }}>{userId}</strong>
        </div>
        <div>
          Users: <strong style={{ color: "#a78bfa" }}>{users.length}</strong>
        </div>
        <div>
          Coords:{" "}
          <strong style={{ color: "#fbbf24" }}>
            ({Math.round(position.x)}, {Math.round(position.y)})
          </strong>
        </div>
        <div>
          🎙️ Mic:{" "}
          <strong style={{ color: micActive ? "#4ade80" : "#64748b" }}>
            {micActive ? "Active" : "Off"}
          </strong>
        </div>
      </div>

      {/* Microphone Controls */}
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          marginBottom: 12,
          padding: "10px 16px",
          background: "#1e293b",
          borderRadius: 8,
          border: "1px solid #334155",
          fontSize: 13,
        }}
      >
        <span style={{ color: "#94a3b8" }}>Microphone:</span>
        {!micActive ? (
          <button
            id="btn-start-mic"
            onClick={startMicrophone}
            style={{
              padding: "5px 14px",
              borderRadius: 6,
              border: "1px solid #22c55e",
              background: "rgba(34,197,94,0.15)",
              color: "#4ade80",
              fontSize: 13,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            🎙️ Start Mic &amp; Enable WebRTC
          </button>
        ) : (
          <button
            id="btn-stop-mic"
            onClick={stopMicrophone}
            style={{
              padding: "5px 14px",
              borderRadius: 6,
              border: "1px solid #ef4444",
              background: "rgba(239,68,68,0.15)",
              color: "#f87171",
              fontSize: 13,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            🔇 Stop Mic
          </button>
        )}
        {micError && (
          <span style={{ color: "#f87171", fontSize: 12 }}>⚠ {micError}</span>
        )}
        {!micActive && !micError && (
          <span style={{ color: "#64748b", fontSize: 12 }}>
            Click to enable spatial audio with other users in the office.
          </span>
        )}
      </div>

      {/* Office Canvas */}
      <OfficeCanvas users={users} currentUserId={userId} onMoveAvatar={handleMoveAvatar} />

      {/* Phase 6 — Spatial Audio Demo Panel */}
      <div
        style={{
          marginTop: 16,
          padding: "14px 16px",
          background: "#1e293b",
          borderRadius: 8,
          border: "1px solid #334155",
          fontSize: 13,
        }}
      >
        <div style={{ fontWeight: 700, color: "#e2e8f0", marginBottom: 10 }}>
          🔊 Spatial Audio — Live Gain Monitor
        </div>

        {/* Local position */}
        <div style={{ marginBottom: 8, color: "#94a3b8" }}>
          <span style={{ color: "#38bdf8", fontWeight: 600 }}>Local:</span>{" "}
          ({Math.round(position.x)}, {Math.round(position.y)}) — Max range:{" "}
          <strong style={{ color: "#e2e8f0" }}>{MAX_AUDIO_DISTANCE}px</strong>
        </div>

        {remoteUsers.length === 0 ? (
          <div style={{ color: "#475569", fontStyle: "italic" }}>
            No remote users in office. Open a second tab to test spatial audio.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ color: "#64748b", textAlign: "left" }}>
                <th style={{ paddingBottom: 6 }}>Remote User</th>
                <th style={{ paddingBottom: 6 }}>Position</th>
                <th style={{ paddingBottom: 6 }}>Distance (px)</th>
                <th style={{ paddingBottom: 6 }}>Target Gain</th>
                <th style={{ paddingBottom: 6 }}>Audio Stream</th>
              </tr>
            </thead>
            <tbody>
              {remoteUsers.map((u) => {
                const debug = audioDebug[u.userId] || {};
                const dist = debug.distance ?? Math.round(calculateDistance(position, u));
                const vol = debug.volume ?? parseFloat(calculateVolume(dist, MAX_AUDIO_DISTANCE).toFixed(3));
                const gainPercent = Math.round(vol * 100);
                const gainColor =
                  gainPercent > 66 ? "#4ade80" :
                  gainPercent > 33 ? "#fbbf24" :
                  gainPercent > 0  ? "#f87171" : "#475569";

                return (
                  <tr key={u.userId} style={{ borderTop: "1px solid #0f172a" }}>
                    <td style={{ padding: "5px 0", color: u.avatarColor || "#c084fc" }}>
                      {u.name || u.userId}
                    </td>
                    <td style={{ color: "#94a3b8" }}>
                      ({Math.round(u.x)}, {Math.round(u.y)})
                    </td>
                    <td style={{ color: "#e2e8f0" }}>{dist}px</td>
                    <td>
                      <span style={{ color: gainColor, fontWeight: 700 }}>
                        {vol.toFixed(3)}
                      </span>
                      {" "}
                      <span
                        style={{
                          display: "inline-block",
                          width: `${gainPercent}px`,
                          maxWidth: 80,
                          height: 6,
                          background: gainColor,
                          borderRadius: 3,
                          verticalAlign: "middle",
                          transition: "width 0.1s",
                        }}
                      />
                    </td>
                    <td style={{ color: debug.audioConnected ? "#4ade80" : "#475569" }}>
                      {debug.audioConnected ? "● Connected" : "○ No stream"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div style={{ marginTop: 10, color: "#475569", fontSize: 11, lineHeight: 1.6 }}>
          ℹ Gain updates automatically as avatars move. At distance 0 → gain 1.000,
          at 150px → gain 0.500, at 300px → gain 0.000.
          <br />
          ⚠ <em>Displayed gain is the computed target value sent to the GainNode. Actual
          perceived attenuation requires two real browser sessions with microphone access
          and an active WebRTC connection.</em>
        </div>
      </div>

      {/* Controls */}
      <div
        style={{
          marginTop: 12,
          padding: 12,
          background: "#1e293b",
          borderRadius: 8,
          fontSize: 13,
          color: "#94a3b8",
          border: "1px solid #334155",
        }}
      >
        <strong style={{ color: "#e2e8f0" }}>Controls:</strong> Hold{" "}
        <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> or Arrow keys to
        move, or <strong>click &amp; drag</strong> the canvas. Cyan aura shows
        the 150px visual proximity radius; spatial audio range is{" "}
        {MAX_AUDIO_DISTANCE}px. Open a second tab to see multiplayer in real time.
      </div>
    </main>
  );
}

/**
 * ProxiSpeak — WebRTC Spatial Audio Manager (Member 3, Day 1)
 *
 * Manages per-user AudioContext pipelines for remote WebRTC audio streams.
 * Each remote user gets an isolated audio graph:
 *   MediaStreamAudioSourceNode → GainNode → AudioContext.destination
 *
 * Design decisions:
 * - A single shared AudioContext is used to avoid hitting the browser's
 *   limit (~6 AudioContexts per page).
 * - Duplicate audio graphs are prevented by checking audioMap before
 *   connecting a new track.
 * - Cleanup removes source nodes, disconnects gain nodes, and removes the
 *   map entry when a user leaves or a stream is replaced.
 * - The AudioContext is resumed after a user gesture to satisfy browser
 *   autoplay policies (pass ensureResumed() to the click/keydown handler).
 *
 * Usage (inside a React component):
 *   const audioManager = useMemo(() => createSpatialAudioManager(), []);
 *
 *   // When a remote track arrives:
 *   audioManager.connectRemoteStream(remoteUserId, mediaStream);
 *
 *   // When positions change:
 *   audioManager.setGain(remoteUserId, volume);        // 0.0 – 1.0
 *   audioManager.updateRemoteVolume(remoteUserId, volume);
 *
 *   // After a user gesture:
 *   audioManager.ensureResumed();
 *
 *   // When a user leaves:
 *   audioManager.disconnectUser(remoteUserId);
 *
 *   // On component unmount:
 *   audioManager.destroy();
 */
export function createSpatialAudioManager() {
  // Lazily created shared AudioContext — avoids autoplay policy violations
  // before a user gesture has occurred.
  let ctx = null;

  /**
   * Map<userId, { source: MediaStreamAudioSourceNode, gain: GainNode, stream: MediaStream }>
   */
  const audioMap = new Map();

  // ─── Private helpers ───────────────────────────────────────────────

  function getOrCreateContext() {
    if (!ctx || ctx.state === 'closed') {
      ctx = new AudioContext();
    }
    return ctx;
  }

  // ─── Public API ────────────────────────────────────────────────────

  /**
   * Resume the AudioContext after a user gesture.
   * Call this inside any click, keydown, or pointer handler.
   */
  function ensureResumed() {
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {
        // Silently ignore — the context will resume on the next gesture
      });
    }
  }

  /**
   * Connect a remote WebRTC MediaStream to an isolated gain node for userId.
   *
   * Safe to call multiple times with the same userId:
   * - If the same stream is already connected, this is a no-op.
   * - If a different stream arrives (track replacement), the old pipeline
   *   is cleaned up first.
   *
   * @param {string}      userId - Remote user identifier
   * @param {MediaStream} stream - Remote audio MediaStream from RTCPeerConnection.ontrack
   */
  function connectRemoteStream(userId, stream) {
    if (!userId || !(stream instanceof MediaStream)) return;

    const existing = audioMap.get(userId);

    // No-op if the exact same stream is already wired up
    if (existing && existing.stream === stream) return;

    // Different stream arrived — clean up old pipeline first
    if (existing) {
      _cleanupUser(userId);
    }

    const context = getOrCreateContext();

    const source = context.createMediaStreamSource(stream);
    const gain = context.createGain();
    gain.gain.setValueAtTime(1.0, context.currentTime); // start at full volume

    source.connect(gain);
    gain.connect(context.destination);

    audioMap.set(userId, { source, gain, stream, context });

    // Auto-resume if a gesture was already received before this stream arrived
    ensureResumed();
  }

  /**
   * Update the gain for a specific remote user.
   * Uses setTargetAtTime for smooth ramping (10ms time constant).
   *
   * @param {string} userId - Remote user identifier
   * @param {number} volume - Target gain value in [0, 1]
   */
  function setGain(userId, volume) {
    const entry = audioMap.get(userId);
    if (!entry) return;

    const clampedVolume = Math.max(0, Math.min(1, volume));
    entry.gain.gain.setTargetAtTime(
      clampedVolume,
      entry.context.currentTime,
      0.1 // 100ms smooth ramp
    );
  }

  /**
   * Get a snapshot of the audio pipeline for a user.
   * Returns null if the user has no connected stream.
   *
   * @param {string} userId
   * @returns {{ gain: GainNode, stream: MediaStream, context: AudioContext } | null}
   */
  function getAudioEntry(userId) {
    return audioMap.get(userId) ?? null;
  }

  /**
   * Returns an array of connected remote user IDs.
   */
  function getConnectedUsers() {
    return Array.from(audioMap.keys());
  }

  /**
   * Disconnect and clean up the audio pipeline for a specific user.
   * Call when a remote user leaves the office.
   *
   * @param {string} userId
   */
  function disconnectUser(userId) {
    _cleanupUser(userId);
  }

  /** @private */
  function _cleanupUser(userId) {
    const entry = audioMap.get(userId);
    if (!entry) return;

    try {
      entry.source.disconnect();
    } catch (_) {}

    try {
      entry.gain.disconnect();
    } catch (_) {}

    audioMap.delete(userId);
  }

  /**
   * Destroy the entire audio manager: disconnect all users and close the
   * AudioContext. Call on component unmount.
   */
  function destroy() {
    for (const userId of audioMap.keys()) {
      _cleanupUser(userId);
    }

    if (ctx && ctx.state !== 'closed') {
      ctx.close().catch(() => {});
      ctx = null;
    }
  }

  return {
    ensureResumed,
    connectRemoteStream,
    setGain,
    updateRemoteVolume: setGain,
    getAudioEntry,
    getConnectedUsers,
    disconnectUser,
    destroy,
    /** Expose the context for testing / demo panels */
    get context() {
      return ctx;
    },
  };
}

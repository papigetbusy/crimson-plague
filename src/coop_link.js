/* The talking between a host's game and a friend's game (pure: no network of its own).
   You hand it a `send` function; it hands you `onMessage`. The real link (WebRTC, room code) and the test link (in memory) both plug in the same way.
   Friend -> host, about 20 times a second: where I am and how I am, and the damage I did.   Host -> friend, about 16 times a second: the world and what happened in it. */
const CoopLink = (function () {
  'use strict';
  const RC = typeof RefereeCoop !== 'undefined' ? RefereeCoop : require('./referee_coop.js');
  const EVERY_FRIEND = 0.05, EVERY_HOST = 0.06;

  // host: ref = the host's referee. send(key, msg) delivers one message to one friend.
  function host(ref, send) {
    let acc = 0, buf = [];
    return {
      onMessage(key, msg) {
        if (msg.t === 'hello') { const ok = ref.remoteJoin(key, msg.name, msg.skin); send(key, { t: 'welcome', ok, seed: ref.seeds().map, key }); }
        else if (msg.t === 'st') { ref.remoteState(key, msg.s); if (msg.d && msg.d.length) ref.remoteDamage(key, msg.d); if (msg.sh && msg.sh.length) ref.remoteShots(key, msg.sh); if (msg.lk && msg.lk.length) ref.remoteLocks(key, msg.lk); }
        else if (msg.t === 'bye') ref.remoteLeave(key);
      },
      leave(key) { ref.remoteLeave(key); },
      start() { for (const p of ref.worldView().players) if (p.key !== ref.cfg.selfKey) send(p.key, { t: 'go' }); },       // the host has entered the hall
      // call after every host step with that step's events
      tick(dt, events) {
        buf = buf.concat(RC.worldEvents(events)); acc += dt;
        if (acc < EVERY_HOST) return;
        acc = 0;
        const w = ref.worldView(), e = buf; buf = [];
        for (const p of w.players) if (p.key !== ref.cfg.selfKey) send(p.key, { t: 'w', w, e });
      }
    };
  }
  // friend: ref = the friend's own referee. send(msg) delivers one message to the host.
  function guest(ref, send, name, onWelcome) {
    let acc = 0, welcomed = false;
    return {
      hello() { send({ t: 'hello', name, skin: ref.cfg.selfSkin || '' }); },
      get ready() { return welcomed; },
      onMessage(msg) { if (msg.t === 'welcome') { welcomed = !!msg.ok; if (onWelcome) onWelcome(msg); } else if (msg.t === 'go') { if (onWelcome) onWelcome(msg); } else if (msg.t === 'w') ref.applyWorld(msg.w, msg.e); },
      tick(dt) {
        acc += dt; if (acc < EVERY_FRIEND) return;
        acc = 0; send({ t: 'st', s: ref.selfState(), d: ref.guestOut(), sh: ref.shotsOut(), lk: ref.locksOut() });
      },
      bye() { send({ t: 'bye' }); }
    };
  }
  return { host, guest, EVERY_FRIEND, EVERY_HOST };
})();
if (typeof module !== 'undefined') module.exports = CoopLink;

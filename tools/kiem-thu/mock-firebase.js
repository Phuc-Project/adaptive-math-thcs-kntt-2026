/* Mock Firebase compat SDK cho kiểm thử: auth + firestore, dữ liệu ở tiến trình Node (window.__fb). */
(function () {
  'use strict';
  const call = (op, args) => window.__fb(op, args);
  const AUTH_KEY = '__mockauth';

  function reviveTs(v) {
    if (v && typeof v === 'object') {
      if (typeof v.__ts === 'number') {
        const ms = v.__ts;
        return { toDate: () => new Date(ms), toMillis: () => ms, seconds: Math.floor(ms / 1000) };
      }
      if (Array.isArray(v)) return v.map(reviveTs);
      const o = {};
      for (const k of Object.keys(v)) o[k] = reviveTs(v[k]);
      return o;
    }
    return v;
  }
  function enc(v) {
    if (v && v.__sentinel) return v.__sentinel === 'ts' ? { __serverTs: 1 } : { __del: 1 };
    if (v && typeof v === 'object') {
      if (Array.isArray(v)) return v.map(enc);
      const o = {};
      for (const k of Object.keys(v)) if (v[k] !== undefined) o[k] = enc(v[k]);
      return o;
    }
    return v;
  }
  function err(e) {
    const x = new Error(e.message || e.code);
    x.code = e.code;
    return x;
  }

  // ------------------------------------------------------------ auth
  const listeners = [];
  let current = null;
  function makeUser(u) {
    if (!u) return null;
    return {
      uid: u.uid,
      email: u.email,
      displayName: u.displayName || null,
      getIdToken: async () => 'mock-token-' + u.uid,
      updateProfile: async (p) => {
        await call('updateProfile', { uid: u.uid, displayName: p.displayName });
        current.displayName = p.displayName;
      },
    };
  }
  function setUser(u) {
    current = makeUser(u);
    try {
      if (u) localStorage.setItem(AUTH_KEY, JSON.stringify(u));
      else localStorage.removeItem(AUTH_KEY);
    } catch (e) {}
    setTimeout(() => listeners.forEach((fn) => fn(current)), 0);
  }
  const authApi = {
    get currentUser() {
      return current;
    },
    onAuthStateChanged(fn) {
      listeners.push(fn);
      setTimeout(() => fn(current), 20);
      return () => listeners.splice(listeners.indexOf(fn), 1);
    },
    async createUserWithEmailAndPassword(email, password) {
      const r = await call('createUser', { email, password });
      if (r.error) throw err(r.error);
      setUser(r.user);
      return { user: current };
    },
    async signInWithEmailAndPassword(email, password) {
      const r = await call('signIn', { email, password });
      if (r.error) throw err(r.error);
      setUser(r.user);
      return { user: current };
    },
    async signInWithPopup() {
      const r = await call('google', {});
      if (r.error) throw err(r.error);
      setUser(r.user);
      return { user: current };
    },
    async sendPasswordResetEmail() {},
    async signOut() {
      setUser(null);
    },
  };
  try {
    const saved = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
    if (saved) current = makeUser(saved);
  } catch (e) {}

  // ------------------------------------------------------------ firestore
  function uid() {
    return current ? current.uid : null;
  }
  function snapOf(path, r) {
    return {
      id: path.split('/').pop(),
      exists: !!r.exists,
      ref: docRef(path),
      data: () => (r.exists ? reviveTs(r.data) : undefined),
    };
  }
  async function run(op, args) {
    const r = await call(op, Object.assign({ uid: uid() }, args));
    if (r && r.error) throw err(r.error);
    return r;
  }
  function docRef(path) {
    return {
      id: path.split('/').pop(),
      path,
      collection: (name) => colRef(path + '/' + name),
      async get() {
        return snapOf(path, await run('get', { path }));
      },
      async set(data, opts) {
        await run('set', { path, data: enc(data), merge: !!(opts && opts.merge) });
      },
      async update(data) {
        await run('update', { path, data: enc(data) });
      },
      async delete() {
        await run('delete', { path });
      },
      onSnapshot(next, onErr) {
        let last = null;
        let stop = false;
        const tick = async () => {
          if (stop) return;
          try {
            const r = await run('get', { path });
            const s = JSON.stringify(r);
            if (s !== last) {
              last = s;
              next(snapOf(path, r));
            }
          } catch (e) {
            if (onErr) onErr(e);
            stop = true;
            return;
          }
          setTimeout(tick, 400);
        };
        tick();
        return () => {
          stop = true;
        };
      },
    };
  }
  function queryRef(path, filters) {
    const q = {
      where: (f, o, v) => queryRef(path, filters.concat([[f, o, v]])),
      async get() {
        const r = await run('list', { path, filters });
        const docs = r.docs.map((d) => snapOf(path + '/' + d.id, { exists: true, data: d.data }));
        return { docs, size: docs.length, empty: docs.length === 0, forEach: (fn) => docs.forEach(fn) };
      },
      onSnapshot(next, onErr) {
        let last = null;
        let stop = false;
        const tick = async () => {
          if (stop) return;
          try {
            const r = await run('list', { path, filters });
            const s = JSON.stringify(r);
            if (s !== last) {
              last = s;
              const docs = r.docs.map((d) => snapOf(path + '/' + d.id, { exists: true, data: d.data }));
              next({ docs, size: docs.length, empty: docs.length === 0, forEach: (fn) => docs.forEach(fn) });
            }
          } catch (e) {
            if (onErr) onErr(e);
            stop = true;
            return;
          }
          setTimeout(tick, 400);
        };
        tick();
        return () => {
          stop = true;
        };
      },
    };
    return q;
  }
  function colRef(path) {
    const q = queryRef(path, []);
    q.doc = (id) => docRef(path + '/' + (id || Math.random().toString(36).slice(2)));
    return q;
  }
  const db = { collection: (name) => colRef(name) };

  const apps = [];
  window.firebase = {
    apps,
    initializeApp(cfg) {
      apps.push({ options: cfg });
      return apps[0];
    },
    app: () => apps[0],
    auth: Object.assign(() => authApi, {
      GoogleAuthProvider: function () {
        this.setCustomParameters = () => {};
      },
    }),
    firestore: Object.assign(() => db, {
      FieldValue: {
        serverTimestamp: () => ({ __sentinel: 'ts' }),
        delete: () => ({ __sentinel: 'del' }),
      },
    }),
  };
})();

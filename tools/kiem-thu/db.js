// Firestore giả lập + bản port firestore.rules (để bắt lỗi permission-denied khi test).
'use strict';

function createDb(opts) {
  const rulesVariant = (opts && opts.rules) || 'new';
  const docs = new Map(); // path -> data
  const users = new Map(); // email -> {uid,email,password,displayName}
  const log = [];
  let n = 0;
  const now = () => Date.now();

  const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  const deq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  function resolveSentinels(v) {
    if (v && typeof v === 'object') {
      if (v.__serverTs) return { __ts: now() };
      if (Array.isArray(v)) return v.map(resolveSentinels);
      const o = {};
      for (const k of Object.keys(v)) o[k] = resolveSentinels(v[k]);
      return o;
    }
    return v;
  }

  function applyUpdate(base, data) {
    const out = clone(base) || {};
    for (const key of Object.keys(data)) {
      const val = data[key];
      const parts = key.split('.');
      let obj = out;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!obj[parts[i]] || typeof obj[parts[i]] !== 'object') obj[parts[i]] = {};
        obj = obj[parts[i]];
      }
      const last = parts[parts.length - 1];
      if (val && val.__del) delete obj[last];
      else obj[last] = resolveSentinels(val);
    }
    return out;
  }
  function mergeDeep(base, data) {
    const out = clone(base) || {};
    for (const k of Object.keys(data)) {
      const v = data[k];
      if (v && v.__del) delete out[k];
      else if (v && typeof v === 'object' && !Array.isArray(v) && !v.__serverTs && out[k] && typeof out[k] === 'object')
        out[k] = mergeDeep(out[k], v);
      else out[k] = resolveSentinels(v);
    }
    return out;
  }
  function affectedKeys(before, after) {
    const keys = new Set(Object.keys(before || {}).concat(Object.keys(after || {})));
    return [...keys].filter((k) => !deq((before || {})[k], (after || {})[k]));
  }

  // ---------------------------------------------------------------- rules
  const role = (uid) => (docs.get('users/' + uid) || {}).role;
  const isAdmin = (uid) => !!uid && docs.has('users/' + uid) && role(uid) === 'admin';
  const isTeacher = (uid) => !!uid && docs.has('users/' + uid) && role(uid) === 'teacher';
  const ownsClass = (uid, code) => !!uid && docs.has('classes/' + code) && docs.get('classes/' + code).teacherId === uid;
  const USER_KEYS = ['classCode', 'className', 'grade', 'goal', 'dailyMinutes', 'hasDiagnostic', 'xp', 'level', 'currentStreak',
    'longestStreak', 'masteredTopics', 'totalQuestions', 'totalSessions', 'unresolvedErrors', 'lastActiveAt', 'lastLoginAt'];

  function allow(op, path, uid, before, after, filters) {
    const p = path.split('/');
    if (p[0] === 'users' && p.length === 2) {
      const id = p[1];
      if (op === 'get') return uid === id || isAdmin(uid);
      if (op === 'list') return isAdmin(uid);
      if (op === 'create') return uid === id && ['student', 'teacher'].includes(after.role) && typeof after.email === 'string';
      if (op === 'update')
        return isAdmin(uid) || (uid === id && after.role === before.role && affectedKeys(before, after).every((k) => USER_KEYS.includes(k)));
      return false;
    }
    if (p[0] === 'learners' && p.length === 4) return uid === p[1];
    if (p[0] === 'classes' && p.length === 2) {
      const code = p[1];
      if (op === 'get') return !!uid;
      if (op === 'create') return isTeacher(uid) && after.teacherId === uid && typeof after.name === 'string' && after.name.length > 0;
      if (op === 'update') return ownsClass(uid, code) && after.teacherId === before.teacherId;
      if (op === 'delete') return ownsClass(uid, code);
      return false;
    }
    if (p[0] === 'classes' && p.length === 1 && op === 'list') {
      return !!uid && filters.some((f) => f[0] === 'teacherId' && f[1] === '==' && f[2] === uid);
    }
    if (p[0] === 'classes' && p[2] === 'members') {
      const code = p[1];
      if (p.length === 3 && op === 'list') return ownsClass(uid, code);
      const id = p[3];
      if (op === 'get') return uid === id || ownsClass(uid, code);
      if (op === 'create') return uid === id && after.uid === id && docs.has('classes/' + code);
      if (op === 'update') {
        let selfOk;
        if (rulesVariant === 'old') {
          selfOk = uid === id && after.uid === before.uid && (!('help' in after) || after.help.status === 'pending');
        } else {
          selfOk =
            uid === id &&
            after.uid === before.uid &&
            (!('help' in after) ||
              after.help.status === 'pending' ||
              ('help' in before && deq(after.help, before.help)));
        }
        const teacherOk = ownsClass(uid, code) && affectedKeys(before, after).every((k) => k === 'help');
        return selfOk || teacherOk;
      }
      if (op === 'delete') return uid === id || ownsClass(uid, code);
      return false;
    }
    return false;
  }

  function deny(op, path) {
    log.push({ denied: op, path });
    return { error: { code: 'permission-denied', message: 'Missing or insufficient permissions. (' + op + ' ' + path + ')' } };
  }

  const handlers = {
    createUser({ email, password }) {
      if (users.has(email)) return { error: { code: 'auth/email-already-in-use' } };
      if (!password || password.length < 6) return { error: { code: 'auth/weak-password' } };
      const u = { uid: 'u' + ++n, email, password, displayName: null };
      users.set(email, u);
      return { user: { uid: u.uid, email, displayName: null } };
    },
    signIn({ email, password }) {
      const u = users.get(email);
      if (!u || u.password !== password) return { error: { code: 'auth/invalid-credential' } };
      return { user: { uid: u.uid, email, displayName: u.displayName } };
    },
    google() {
      const email = 'google' + (n + 1) + '@gmail.com';
      return handlers.createUser({ email, password: 'xxxxxx' });
    },
    updateProfile({ uid, displayName }) {
      for (const u of users.values()) if (u.uid === uid) u.displayName = displayName;
      return {};
    },
    get({ uid, path }) {
      const before = docs.get(path);
      if (!allow('get', path, uid, before)) return deny('get', path);
      return { exists: docs.has(path), data: clone(before) };
    },
    list({ uid, path, filters }) {
      if (!allow('list', path, uid, null, null, filters || [])) return deny('list', path);
      const depth = path.split('/').length + 1;
      const out = [];
      for (const [k, v] of docs) {
        if (!k.startsWith(path + '/') || k.split('/').length !== depth) continue;
        if ((filters || []).every((f) => f[1] === '==' && v[f[0]] === f[2])) out.push({ id: k.split('/').pop(), data: clone(v) });
      }
      return { docs: out };
    },
    set({ uid, path, data, merge }) {
      const before = docs.get(path);
      const after = merge && before ? mergeDeep(before, data) : resolveSentinels(merge ? mergeDeep({}, data) : data);
      const op = before ? 'update' : 'create';
      if (!allow(op, path, uid, before, after)) return deny(op + '(set)', path);
      docs.set(path, after);
      return {};
    },
    update({ uid, path, data }) {
      const before = docs.get(path);
      if (!before) return { error: { code: 'not-found', message: 'No document to update: ' + path } };
      const after = applyUpdate(before, data);
      if (!allow('update', path, uid, before, after)) return deny('update', path);
      docs.set(path, after);
      return {};
    },
    delete({ uid, path }) {
      const before = docs.get(path);
      if (!allow('delete', path, uid, before)) return deny('delete', path);
      docs.delete(path);
      return {};
    },
  };

  return {
    docs,
    users,
    log,
    handle(op, args) {
      const fn = handlers[op];
      if (!fn) return { error: { code: 'unimplemented', message: op } };
      return fn(args || {});
    },
    // admin helpers
    setRole(email, r) {
      const u = users.get(email);
      const d = docs.get('users/' + u.uid);
      d.role = r;
    },
  };
}

module.exports = { createDb };

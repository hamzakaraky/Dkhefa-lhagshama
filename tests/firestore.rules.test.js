/**
 * Firestore security rules unit tests.
 *
 * Tests:
 *   - /requests: owner, handler, admin can read; strangers cannot.
 *   - /chats:    participants can read; non-participants cannot (Risk-#5).
 *   - /messages: participants of the parent chat can read; strangers cannot.
 *   - Writes to all collections are denied to clients.
 *
 * Run via: firebase emulators:exec --only firestore "npm test"
 * The emulator is pointed at the root firestore.rules file.
 */

const { readFileSync } = require("fs");
const { resolve } = require("path");

const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require("@firebase/rules-unit-testing");

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? "demo-test";
const RULES_PATH = resolve(__dirname, "../firestore.rules");

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, "utf8"),
      host: "localhost",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

// ── helpers ──────────────────────────────────────────────────────────────

function authed(uid, tokenOverrides = {}) {
  return testEnv.authenticatedContext(uid, tokenOverrides);
}

function anon() {
  return testEnv.unauthenticatedContext();
}

async function seedDoc(collection, id, data) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await ctx.firestore().collection(collection).doc(id).set(data);
  });
}

// ── /requests ────────────────────────────────────────────────────────────

describe("/requests", () => {
  const REQUEST_ID = "req-001";
  const BENEFICIARY = "uid-bene";
  const HANDLER = "uid-handler";
  const STRANGER = "uid-stranger";

  beforeEach(async () => {
    await seedDoc("requests", REQUEST_ID, {
      beneficiaryId: BENEFICIARY,
      handler: HANDLER,
      category: "education",
      status: "pending",
    });
  });

  test("beneficiary can read own request", async () => {
    const db = authed(BENEFICIARY).firestore();
    await assertSucceeds(db.collection("requests").doc(REQUEST_ID).get());
  });

  test("handler can read assigned request", async () => {
    const db = authed(HANDLER).firestore();
    await assertSucceeds(db.collection("requests").doc(REQUEST_ID).get());
  });

  test("admin can read any request", async () => {
    const db = authed("uid-admin", { role: "admin" }).firestore();
    await assertSucceeds(db.collection("requests").doc(REQUEST_ID).get());
  });

  test("stranger cannot read a request", async () => {
    const db = authed(STRANGER).firestore();
    await assertFails(db.collection("requests").doc(REQUEST_ID).get());
  });

  test("unauthenticated user cannot read a request", async () => {
    const db = anon().firestore();
    await assertFails(db.collection("requests").doc(REQUEST_ID).get());
  });

  test("client cannot write a request", async () => {
    const db = authed(BENEFICIARY).firestore();
    await assertFails(
      db.collection("requests").doc("req-new").set({ beneficiaryId: BENEFICIARY })
    );
  });

  test("assigned volunteer can read the request (#64)", async () => {
    const VOLUNTEER = "uid-assigned-vol";
    await seedDoc("requests", "req-assigned", {
      beneficiaryId: BENEFICIARY,
      handler: null,
      assignedVolunteerId: VOLUNTEER,
      category: "education",
      status: "in_progress",
    });
    const db = authed(VOLUNTEER, { role: "volunteer" }).firestore();
    await assertSucceeds(db.collection("requests").doc("req-assigned").get());
  });

  test("unassigned volunteer cannot read someone else's request (#64)", async () => {
    const db = authed("uid-other-vol", { role: "volunteer" }).firestore();
    await assertFails(db.collection("requests").doc(REQUEST_ID).get());
  });
});

// ── /users — UC profile (#63) ─────────────────────────────────────────────

describe("/users", () => {
  const OWNER = "uid-profile-owner";
  const STRANGER = "uid-profile-stranger";

  beforeEach(async () => {
    await seedDoc("users", OWNER, {
      email: "owner@example.com",
      role: "beneficiary",
      displayName: "Owner",
    });
  });

  test("owner can read own profile", async () => {
    const db = authed(OWNER).firestore();
    await assertSucceeds(db.collection("users").doc(OWNER).get());
  });

  test("admin can read any profile", async () => {
    const db = authed("uid-admin", { role: "admin" }).firestore();
    await assertSucceeds(db.collection("users").doc(OWNER).get());
  });

  test("stranger cannot read another user's profile", async () => {
    const db = authed(STRANGER).firestore();
    await assertFails(db.collection("users").doc(OWNER).get());
  });

  test("unauthenticated user cannot read a profile", async () => {
    const db = anon().firestore();
    await assertFails(db.collection("users").doc(OWNER).get());
  });

  test("client cannot write its own profile (server-only via PATCH)", async () => {
    const db = authed(OWNER).firestore();
    await assertFails(
      db.collection("users").doc(OWNER).set({ role: "admin" }, { merge: true })
    );
  });
});

// ── /requestEvents — timeline (#65) ────────────────────────────────────────

describe("/requestEvents", () => {
  const BENEFICIARY = "uid-re-bene";
  const PARENT_REQUEST = "req-re-001";

  beforeEach(async () => {
    await seedDoc("requests", PARENT_REQUEST, {
      beneficiaryId: BENEFICIARY,
      handler: null,
      category: "legal",
      status: "pending",
    });
    await seedDoc("requestEvents", "evt-public", {
      requestId: PARENT_REQUEST,
      type: "created",
      visibility: "all",
      actorId: BENEFICIARY,
    });
    await seedDoc("requestEvents", "evt-internal", {
      requestId: PARENT_REQUEST,
      type: "note_added",
      visibility: "internal",
      actorId: "uid-admin",
    });
  });

  test("admin can read any event", async () => {
    const db = authed("uid-admin", { role: "admin" }).firestore();
    await assertSucceeds(db.collection("requestEvents").doc("evt-internal").get());
  });

  test("volunteer can read any event", async () => {
    const db = authed("uid-vol", { role: "volunteer" }).firestore();
    await assertSucceeds(db.collection("requestEvents").doc("evt-internal").get());
  });

  test("beneficiary can read a public event on own request", async () => {
    const db = authed(BENEFICIARY).firestore();
    await assertSucceeds(db.collection("requestEvents").doc("evt-public").get());
  });

  test("beneficiary cannot read an internal event on own request", async () => {
    const db = authed(BENEFICIARY).firestore();
    await assertFails(db.collection("requestEvents").doc("evt-internal").get());
  });

  test("stranger cannot read a public event on someone else's request", async () => {
    const db = authed("uid-re-stranger").firestore();
    await assertFails(db.collection("requestEvents").doc("evt-public").get());
  });

  test("unauthenticated user cannot read an event", async () => {
    const db = anon().firestore();
    await assertFails(db.collection("requestEvents").doc("evt-public").get());
  });

  test("client cannot write an event", async () => {
    const db = authed(BENEFICIARY).firestore();
    await assertFails(
      db.collection("requestEvents").doc("evt-new").set({
        requestId: PARENT_REQUEST,
        type: "created",
        visibility: "all",
        actorId: BENEFICIARY,
      })
    );
  });
});

// ── /chats (Risk-#5 mitigation) ──────────────────────────────────────────

describe("/chats", () => {
  const CHAT_ID = "chat-001";
  const PARTICIPANT_A = "uid-partA";
  const PARTICIPANT_B = "uid-partB";
  const OUTSIDER = "uid-outsider";

  beforeEach(async () => {
    await seedDoc("chats", CHAT_ID, {
      requestId: "req-001",
      participants: [PARTICIPANT_A, PARTICIPANT_B],
      lastMessageAt: new Date(),
    });
  });

  test("participant A can read the chat", async () => {
    const db = authed(PARTICIPANT_A).firestore();
    await assertSucceeds(db.collection("chats").doc(CHAT_ID).get());
  });

  test("participant B can read the chat", async () => {
    const db = authed(PARTICIPANT_B).firestore();
    await assertSucceeds(db.collection("chats").doc(CHAT_ID).get());
  });

  test("non-participant is denied read", async () => {
    const db = authed(OUTSIDER).firestore();
    await assertFails(db.collection("chats").doc(CHAT_ID).get());
  });

  test("unauthenticated user is denied read", async () => {
    const db = anon().firestore();
    await assertFails(db.collection("chats").doc(CHAT_ID).get());
  });

  test("client cannot create a chat", async () => {
    const db = authed(PARTICIPANT_A).firestore();
    await assertFails(
      db.collection("chats").doc("chat-new").set({
        participants: [PARTICIPANT_A],
        requestId: "req-x",
        lastMessageAt: new Date(),
      })
    );
  });
});

// ── /messages ────────────────────────────────────────────────────────────

describe("/messages", () => {
  const CHAT_ID = "chat-002";
  const MSG_ID = "msg-001";
  const PARTICIPANT_A = "uid-msgPartA";
  const PARTICIPANT_B = "uid-msgPartB";
  const OUTSIDER = "uid-msgOutsider";

  beforeEach(async () => {
    await seedDoc("chats", CHAT_ID, {
      requestId: "req-002",
      participants: [PARTICIPANT_A, PARTICIPANT_B],
      lastMessageAt: new Date(),
    });
    await seedDoc("messages", MSG_ID, {
      chatId: CHAT_ID,
      senderId: PARTICIPANT_A,
      content: "Hello",
      timestamp: new Date(),
      status: "sent",
    });
  });

  test("participant can read a message", async () => {
    const db = authed(PARTICIPANT_A).firestore();
    await assertSucceeds(db.collection("messages").doc(MSG_ID).get());
  });

  test("non-participant is denied reading a message", async () => {
    const db = authed(OUTSIDER).firestore();
    await assertFails(db.collection("messages").doc(MSG_ID).get());
  });

  test("unauthenticated user is denied reading a message", async () => {
    const db = anon().firestore();
    await assertFails(db.collection("messages").doc(MSG_ID).get());
  });

  test("client cannot write a message", async () => {
    const db = authed(PARTICIPANT_A).firestore();
    await assertFails(
      db.collection("messages").doc("msg-new").set({
        chatId: CHAT_ID,
        senderId: PARTICIPANT_A,
        content: "Hi",
        timestamp: new Date(),
        status: "sent",
      })
    );
  });
});

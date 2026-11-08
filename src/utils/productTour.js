/**
 * Product tours.
 *
 * Sales, Credit Team, Credit Head, and Disbursal each have their own
 * steps. Other roles get the shorter general tour.
 *
 * A tour auto-opens once per role. Replay anytime with requestProductTour()
 * (the profile menu uses this). The summary page and the full lead file
 * each have their own tour, started the first time that screen opens.
 * Seen state is stored per role, plus "summary" and "lead", under TOUR_STORAGE_KEY.
 *
 * A step with no `target` is centered. A step with `target` spotlights
 * that element. `highlight: "outline"` dims the page and traces the
 * element instead of cutting a hole. `expandSidebar` opens the menu
 * before measuring a sidebar link.
 */

export const TOUR_STORAGE_KEY = "sfl-crm:product-tour:v2";
export const LEAD_TOUR_SEEN_ID = "lead-v3";
export const TOUR_START_EVENT = "sfl-crm:start-tour";
export const LEAD_TOUR_START_EVENT = "sfl-crm:start-lead-tour";
export const SUMMARY_TOUR_START_EVENT = "sfl-crm:start-summary-tour";
export const LEAD_TOUR_DISMISS_EVENT = "sfl-crm:lead-tour-dismiss";
export const TOUR_PREPARE_EVENT = "sfl-crm:tour-prepare";
export const TOUR_END_EVENT = "sfl-crm:tour-end";
export const LEAD_TAB_EVENT = "lead-modal-tab-sync";

const TOUR_ROLES = new Set([
  "admin",
  "sales-ops",
  "credit-head",
  "credit-analyst",
  "disbursal-head",
  "marketing",
  "quality-checker",
]);

function queueStep(path, title, body) {
  return {
    id: path.replaceAll("/", "-"),
    title,
    body,
    target: `[data-tour="nav:${path}"]`,
    placement: "right",
    expandSidebar: true,
  };
}

function searchStep() {
  return {
    id: "search",
    title: "Find a lead fast",
    body: "Search by PAN, mobile, name, or email domain. Type at least 3 characters, then press Enter for the full list.",
    target: "[data-tour='global-search']",
    placement: "bottom",
  };
}

function tutorialStep() {
  return {
    id: "crm-tutorial",
    title: "Watch the full tutorial",
    body: "Tutorial, in this menu, plays the full CRM walkthrough. Choose English or Hindi.",
    target: "[data-tour='crm-tutorial']",
    placement: "left",
    openUserMenu: true,
  };
}

function accountStep() {
  return {
    id: "account",
    title: "Your account menu",
    body: "Open your name for Profile, What's new, Tutorial, Take a tour, and Change Password. Logout is the last item.",
    target: "[data-tour='user-menu']",
    placement: "left",
  };
}

function workspaceStep(body) {
  return {
    id: "workspace",
    title: "Open a lead from here",
    body,
    target: "[data-tour='workspace']",
    placement: "center",
    highlight: "outline",
  };
}

function withSearch(steps, hasSearch) {
  if (!hasSearch) return steps;
  const next = steps.slice();
  next.splice(next.length - 1, 0, searchStep());
  return next;
}

const ROLE_TOURS = {
  "sales-ops": {
    kicker: "Sales tour",
    steps: (hasSearch) =>
      withSearch(
        [
          {
            id: "welcome",
            title: "Welcome to Sales",
            body: "This tour follows the queues you use to pick up applications, collect dues, and bring customers back for a reloan.",
            placement: "center",
          },
          queueStep(
            "sales-ops/dashboard",
            "Start with your dashboard",
            "Dashboard is your performance view. Team leads see the team page. Everyone else sees their own numbers."
          ),
          queueStep(
            "sales-ops/partial",
            "Partial leads",
            "Partial Leads are applications still being completed. Assigned Partial, just below, is the set already given to you."
          ),
          queueStep(
            "sales-ops/marketing-leads",
            "Marketing leads",
            "Marketing Leads are fresh campaign applications. Assigned Marketing is your share of that list."
          ),
          queueStep(
            "sales-ops/today-recovery-leads",
            "Recoveries due today",
            "Today's Recovery Leads are due today. Assigned Recovery Leads are the ones already on you."
          ),
          queueStep(
            "sales-ops/priority-reloan",
            "Reloan follow-up",
            "Priority Reloan is who to call first. Not Taken Reloan and Assigned Not Taken Reloan sit just under it."
          ),
          queueStep(
            "sales-ops/completed",
            "Closed sales cases",
            "Completed and Rejected are finished sales cases. Unserviceable PinCode Leads are addresses you cannot serve."
          ),
          tutorialStep(),
          accountStep(),
          workspaceStep(
            "Lead lists open in this area. Select a row to see the customer, add a comment, and move the lead."
          ),
        ],
        hasSearch
      ),
  },
  "credit-analyst": {
    kicker: "Credit Team tour",
    steps: (hasSearch) =>
      withSearch(
        [
          {
            id: "welcome",
            title: "Welcome to Credit Team",
            body: "This tour follows a credit file from a rules reject, through your assigned cases, to the decision and the audit.",
            placement: "center",
          },
          queueStep(
            "credit-analyst/bre-rejected-app",
            "Cases the rules stopped",
            "BRE Rejected Application is where a bureau or policy rule stopped a file and a person needs to look at it."
          ),
          queueStep(
            "credit-analyst/allocated-application",
            "Your assigned files",
            "Assigned Application is your working list. Open these first when you start the day."
          ),
          queueStep(
            "credit-analyst/approved-application",
            "Where decisions land",
            "Approved Application and Rejected Application, just below, hold the files after you decide."
          ),
          queueStep(
            "credit-analyst/audit-leads",
            "Audit work",
            "Audit Leads are files to review. Allocated, Approved, and Rejected Audit Leads track that work after you pick it up."
          ),
          queueStep(
            "credit-analyst/action-pan",
            "Action Pan",
            "Action Pan is for checks and overrides that do not belong to a single queue."
          ),
          tutorialStep(),
          accountStep(),
          workspaceStep(
            "Open a row to read the file and record the credit decision."
          ),
        ],
        hasSearch
      ),
  },
  "credit-head": {
    kicker: "Credit Head tour",
    steps: (hasSearch) =>
      withSearch(
        [
          {
            id: "welcome",
            title: "Welcome, Credit Head",
            body: "This tour follows an audit file from the unassigned pool through assignment, approval, and rejection.",
            placement: "center",
          },
          queueStep(
            "credit-head/unassigned-audit-leads",
            "Audit leads waiting",
            "Audit Leads are files that still need an owner. Assign them from this list."
          ),
          queueStep(
            "credit-head/assigned-audit-leads",
            "Already assigned",
            "Assigned Audit Leads are with a reviewer. Use this list to see what is in progress."
          ),
          queueStep(
            "credit-head/approved-audit-leads",
            "Approved audits",
            "Approved Audit Leads are files the audit has cleared."
          ),
          queueStep(
            "credit-head/rejected-audit-leads",
            "Rejected audits",
            "Rejected Audit Leads are files the audit has turned down."
          ),
          queueStep(
            "credit-head/action-pan",
            "Action Pan",
            "Action Pan is for checks and overrides that sit outside the audit lists."
          ),
          tutorialStep(),
          accountStep(),
          workspaceStep(
            "Open a lead here to assign it or review the audit outcome."
          ),
        ],
        hasSearch
      ),
  },
  "disbursal-head": {
    kicker: "Disbursal tour",
    steps: (hasSearch) =>
      withSearch(
        [
          {
            id: "welcome",
            title: "Welcome to Disbursal",
            body: "This tour covers the two lists you use to send a loan and to confirm what has already gone out.",
            placement: "center",
          },
          queueStep(
            "disbursal-head/confirmation-pending-disbursal",
            "Waiting to go out",
            "Confirmation Pending Disbursal is the queue of loans that still need to be sent."
          ),
          queueStep(
            "disbursal-head/disbursed",
            "Already sent",
            "Disbursed is the list of loans that have already gone out."
          ),
          queueStep(
            "disbursal-head/action-pan",
            "Action Pan",
            "Action Pan is for disbursal checks and overrides that are not on those two lists."
          ),
          tutorialStep(),
          accountStep(),
          workspaceStep(
            "Open a row to confirm a disbursal or check what was sent."
          ),
        ],
        hasSearch
      ),
  },
};

function readSeenMap() {
  try {
    const raw = window.localStorage.getItem(TOUR_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function isProductTourSeen(role) {
  if (!TOUR_ROLES.has(role)) return true;
  const entry = readSeenMap()[role];
  return entry?.status === "completed" || entry?.status === "skipped";
}

export function markProductTourSeen(role, status) {
  if (!role) return;
  try {
    const seen = readSeenMap();
    seen[role] = { status, at: new Date().toISOString() };
    window.localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(seen));
  } catch {
    // Private mode and blocked storage should not break the tour.
  }
}

export function requestProductTour() {
  window.dispatchEvent(new CustomEvent(TOUR_START_EVENT));
}

export function isLeadTourSeen() {
  const entry = readSeenMap()[LEAD_TOUR_SEEN_ID];
  return entry?.status === "completed" || entry?.status === "skipped";
}

export function requestLeadTour() {
  window.dispatchEvent(new CustomEvent(LEAD_TOUR_START_EVENT));
}

export function isSummaryTourSeen() {
  const entry = readSeenMap().summary;
  return entry?.status === "completed" || entry?.status === "skipped";
}

export function requestSummaryTour() {
  window.dispatchEvent(new CustomEvent(SUMMARY_TOUR_START_EVENT));
}

export function getSummaryTour() {
  return {
    kicker: "Summary tour",
    steps: [
      {
        id: "summary-welcome",
        title: "This is the lead summary",
        body: "A short read of the customer before you open the full file: who they are, what they can borrow, and what you can do next.",
        placement: "center",
      },
      {
        id: "summary-profile",
        title: "Who this lead is",
        body: "Name, stage, fresh or reloan, PAN, mobile, and address sit here. The copy icon on Lead ID copies those details.",
        target: "[data-tour='summary-profile']",
        placement: "bottom",
      },
      {
        id: "summary-decision",
        title: "What they can borrow",
        body: "Net salary, eligible amount, PF, repay date, ROI, and the requested amount. Fresh loans also show the score tiles above this block.",
        target: "[data-tour='summary-decision']",
        placement: "top",
      },
      {
        id: "summary-documents",
        title: "Documents on the lead",
        body: "Open a file with the eye icon, or upload one from the button at the bottom of this card.",
        target: "[data-tour='summary-documents']",
        placement: "left",
      },
      {
        id: "summary-actions",
        title: "What you can do",
        body: "Logs, addresses, the calculator, and a banking link live here. Complete Details opens the full lead file. Approve, Reject, and Hold show when this queue allows them.",
        target: "[data-tour='summary-actions']",
        placement: "left",
      },
      {
        id: "summary-back",
        title: "Back to the list",
        body: "Back returns you to the queue you opened this summary from.",
        target: "[data-tour='summary-back']",
        placement: "bottom",
      },
    ],
  };
}

function leadTabStep(tabId, title, body) {
  return {
    id: `lead-${tabId}`,
    title,
    body,
    target: `[data-tour="lead-tab:${tabId}"]`,
    placement: "bottom",
    leadTab: tabId,
  };
}

function thirdPartyStep(id, title, body) {
  return {
    id: `third-party-${id}`,
    title,
    body,
    target: `[data-tour="third-party:${id}"]`,
    placement: "bottom",
    leadTab: "third-party",
  };
}

export function getLeadTour() {
  return {
    kicker: "Lead tour",
    steps: [
      {
        id: "lead-welcome",
        title: "This is one lead",
        body: "Everything about this customer, from the application to the decision, is in this file.",
        placement: "center",
      },
      {
        id: "lead-tabs",
        title: "The file is split into tabs",
        body: "Customer, loan, bank, review, logs, references, audit, documents, addresses, and the calculator are in this row. Scroll sideways if a tab is off the screen.",
        target: "[data-tour='lead-tabs']",
        placement: "bottom",
      },
      leadTabStep(
        "customer",
        "Who the customer is",
        "Customer Details holds the name, PAN, mobile, and employment for this lead."
      ),
      leadTabStep(
        "loan",
        "The application",
        "Loan Details is the amount, sanction, and repayment on this application."
      ),
      leadTabStep(
        "bank",
        "Where the money goes",
        "Bank Info is the account used when this loan is disbursed."
      ),
      leadTabStep(
        "review-actions",
        "Review Actions",
        "Decisions and document uploads for this lead sit here. Summary appears when the lead is in audit."
      ),
      thirdPartyStep(
        "pan",
        "Pan Detail",
        "Name, PAN status, and whether the PAN check passed for this customer."
      ),
      thirdPartyStep(
        "bsa",
        "BSA Report",
        "The bank statement: salary credits, balances, and EMI payments."
      ),
      thirdPartyStep(
        "cibil",
        "CIBIL Bureau",
        "The credit report, score, and accounts pulled from the bureau."
      ),
      thirdPartyStep(
        "bre",
        "BRE Decision",
        "The rules result for this application, including why it passed or failed."
      ),
      thirdPartyStep(
        "uan",
        "UAN Details",
        "Employment from the universal account number: employer, joining date, and whether they are currently employed."
      ),
      leadTabStep(
        "lead-log",
        "Lead Logs",
        "Each note on the lead is listed here with the remark and the time it was added."
      ),
      leadTabStep(
        "reference",
        "Reference Info",
        "Name, phone, relation, and address for the people the customer listed."
      ),
      leadTabStep(
        "audit-details",
        "Audit Details",
        "Company information, who the audit was assigned to, and how that review ended."
      ),
      leadTabStep(
        "documents",
        "Files on the lead",
        "Documents holds the KYC and the other uploads for this customer."
      ),
      leadTabStep(
        "address",
        "Where they are",
        "Addresses shows the places on the file, including home and work."
      ),
      leadTabStep(
        "calculator",
        "Calculator",
        "Try a loan amount, PF, and ROI here before you approve."
      ),
      {
        id: "lead-actions",
        title: "Decide or leave",
        body: "Approve and Reject show up here when this queue lets you decide. Close leaves the lead without a decision.",
        target: "[data-tour='lead-actions']",
        placement: "top",
      },
    ],
  };
}

function genericSteps({ role, canSwitchRole, hasSearch }) {
  const sidebarCopy = {
    admin:
      "Open the dashboard, Action Pan, employees, and the other admin tools from this menu.",
    marketing: "Action Pan and the marketing page open from this menu.",
    "quality-checker":
      "Review location-suspicious leads here, then find the ones you approved or rejected.",
  };

  const steps = [
    {
      id: "welcome",
      title: "Welcome to the CRM",
      body: "This short tour shows the parts of The Loan Junction you will use every day. You can replay it later from your profile menu.",
      placement: "center",
    },
    {
      id: "sidebar",
      title: "Your pages live here",
      body:
        sidebarCopy[role] ||
        "Open any page from the sidebar. The list matches the role you are working in.",
      target: "[data-tour='sidebar']",
      placement: "right",
      expandSidebar: true,
    },
  ];

  if (hasSearch) steps.push(searchStep());

  steps.push(
    {
      id: "whats-new",
      title: "See what changed",
      body: "New features and fixes show up here. A red badge means there is something you have not opened yet.",
      target: "[data-tour='whats-new']",
      placement: "bottom",
    },
    {
      id: "role",
      title: canSwitchRole ? "Switch roles" : "Your current role",
      body: canSwitchRole
        ? "Change role here when you have more than one. Menus and lead lists follow the role you pick."
        : "This is the role you are signed in with. Menus and lead lists match it.",
      target: "[data-tour='role-switch']",
      placement: "bottom",
    },
    tutorialStep(),
    accountStep(),
    workspaceStep(
      "Lead lists, dashboards, and customer details open in this area. Select a row when you are ready to review a lead."
    )
  );

  return steps;
}

export function getProductTour(role, { canSwitchRole, hasSearch }) {
  const dedicated = ROLE_TOURS[role];
  if (dedicated) {
    return {
      kicker: dedicated.kicker,
      steps: dedicated.steps(hasSearch),
    };
  }
  return {
    kicker: "Product tour",
    steps: genericSteps({ role, canSwitchRole, hasSearch }),
  };
}

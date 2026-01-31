import { Frame, User } from '@/types';

export const mockUsers: User[] = [
  {
    id: 'user-1',
    name: 'Alex Chen',
    email: 'alex.chen@company.com',
    role: 'tech_lead',
    avatar: 'AC',
  },
  {
    id: 'user-2',
    name: 'Casey Kim',
    email: 'casey.kim@company.com',
    role: 'engineer',
    avatar: 'CK',
  },
  {
    id: 'user-3',
    name: 'Sam Patel',
    email: 'sam.patel@company.com',
    role: 'senior_engineer',
    avatar: 'SP',
  },
  {
    id: 'user-4',
    name: 'Jordan Lee',
    email: 'jordan.lee@company.com',
    role: 'engineer',
    avatar: 'JL',
  },
];

export const currentUser = mockUsers[0]; // Alex Chen is the Tech Lead viewing

export const mockFrames: Frame[] = [
  // Scenario 1: Bug Fix - Draft, high quality
  {
    id: 'frame-1',
    type: 'bug',
    status: 'draft',
    problemStatement: "When switching telemetry mode from 'fqdn' back to 'region', the server domain is not restored to the default value, leaving the device unable to connect to the telemetry cloud.",
    userPerspective: {
      user: 'Network Administrator / Security Operations Engineer',
      context: 'Managing FortiGate firewall devices in an enterprise environment. Telemetry cloud connection is required for threat intelligence updates, device health monitoring, and compliance reporting.',
      journeySteps: [
        "Admin sets telemetry mode to 'fqdn' to test connection to a staging server (test.com) during maintenance window",
        "Admin verifies staging connection works via 'get cloud-status'",
        "Testing complete, admin switches mode back to 'region' to restore production telemetry connection",
        "Admin runs 'get cloud-status' expecting to see default domain (apigw.fortitelemetry.com)",
        "Admin discovers domain is still 'test.com' - device not connecting to production telemetry cloud",
        "Admin attempts 'set server apigw.fortitelemetry.com' but receives 'command parse error' - field not editable in region mode",
        "Admin has no workaround - device is stuck without telemetry",
      ],
      painPoints: [
        'No error or warning when switching modes - silent failure',
        'Cannot manually correct the domain - field is read-only',
        'Only workaround is factory reset or config restore, both disruptive to production',
        'Loss of telemetry means blind spot in security monitoring',
      ],
    },
    engineeringFraming: {
      principles: [
        'Mode transitions must leave the system in a valid, functional state - no "orphaned" configurations',
        'Default values for mode-specific fields must be restored when returning to that mode',
        'User should never be stuck in an unrecoverable state without explicit warning',
      ],
      nonGoals: [
        'We do NOT preserve custom server when switching back to region (intentional data loss is acceptable here)',
        'We do NOT add a "remember custom server" feature - out of scope',
        'We accept that fix requires firmware update - no hot-patch mechanism available',
      ],
    },
    validationThinking: {
      successSignals: [
        "After fix: switching from fqdn->region results in 'get cloud-status' showing 'apigw.fortitelemetry.com'",
        'Automated test: mode transition test in QA regression suite passes',
        'No manual intervention required to restore connectivity',
      ],
      disconfirmingEvidence: [
        'If domain persists after mode switch, fix is incomplete',
        "If 'get cloud-status' shows any domain other than default after region mode, regression exists",
        'If other mode transitions also fail to reset defaults, problem is broader than initially scoped',
      ],
    },
    confirmation: {
      understandsUserPerspective: true,
      understandsTradeoffs: true,
      knowsValidation: true,
    },
    ownerId: 'user-1',
    createdAt: new Date('2026-01-29T09:00:00'),
    updatedAt: new Date('2026-01-29T10:30:00'),
    aiScore: 88,
  },
  // Scenario 2: Feature - Draft, needs work
  {
    id: 'frame-2',
    type: 'feature',
    status: 'draft',
    problemStatement: 'Need to support database schema migrations for version upgrades',
    userPerspective: {
      user: '',
      context: 'Database needs to evolve as we add features. Currently manual.',
      journeySteps: [
        'Developer adds new table or column to code',
        'Deployment runs migration script',
      ],
      painPoints: [
        'Manual migrations are error-prone',
        'Hard to track which migrations ran',
      ],
    },
    engineeringFraming: {
      principles: [
        'Migrations should be automatic',
        'Should support rollback',
      ],
      nonGoals: [],
    },
    validationThinking: {
      successSignals: [
        'Migrations work correctly',
      ],
      disconfirmingEvidence: [],
    },
    confirmation: {
      understandsUserPerspective: false,
      understandsTradeoffs: false,
      knowsValidation: false,
    },
    ownerId: 'user-2',
    createdAt: new Date('2026-01-28T14:00:00'),
    updatedAt: new Date('2026-01-28T16:00:00'),
    aiScore: 52,
  },
  // Scenario 3: Exploration - Ready for implementation
  {
    id: 'frame-3',
    type: 'exploration',
    status: 'ready',
    problemStatement: 'FHE weekly report generation takes 4+ hours and frequently times out, blocking Monday morning operations reviews and consuming excessive database resources during peak hours.',
    userPerspective: {
      user: 'Operations Manager / Security Analyst',
      context: 'Every Monday at 6 AM, the FHE (FortiHome Enterprise) system generates weekly summary reports for ~200 managed customer sites. These reports are reviewed in the 9 AM operations meeting.',
      journeySteps: [
        'Scheduled job triggers at 6 AM Monday to generate weekly reports for all customer sites',
        'Report aggregates 7 days of telemetry: alerts, device health, bandwidth usage, policy violations',
        'Operations Manager opens dashboard at 8:30 AM to prepare for 9 AM meeting',
        'Dashboard shows "Report generation in progress" or "Report generation failed - timeout"',
        'Manager must either wait (missing meeting prep) or proceed to meeting without current data',
        'If failed, manager submits ticket to engineering; re-run during business hours impacts production database performance',
        'Team makes decisions based on stale data or gut feeling',
      ],
      painPoints: [
        '4+ hour generation time - too slow for Monday morning workflow',
        'Timeout failures (~30% of weeks) require manual re-run',
        'Re-running during business hours degrades dashboard performance',
        'No partial results - either full report or nothing',
        'Manager loses confidence in data-driven decisions',
      ],
    },
    engineeringFraming: {
      principles: [
        'Report generation must complete within 2-hour window (6-8 AM)',
        'Report generation must not degrade production system performance',
        'Prefer incremental improvement over full rewrite',
        'Exploration should identify top 2-3 optimization opportunities with effort/impact estimates',
      ],
      nonGoals: [
        'We are NOT redesigning the report format or content',
        'We are NOT evaluating new reporting tools/vendors',
        'We accept that some optimizations may require schema changes',
        'We prioritize reducing timeout failures over reducing average time (reliability > speed)',
      ],
    },
    validationThinking: {
      successSignals: [
        'Exploration complete: documented analysis of current bottlenecks with profiling data',
        'Identified 2-3 concrete optimization paths with rough effort/impact matrix',
        'Recommendation memo ready for architecture review within 2 weeks',
        'Enough clarity to make build/buy/defer decision',
      ],
      disconfirmingEvidence: [
        'If profiling shows bottleneck is external dependency, optimization options are limited',
        'If report logic is fundamentally O(n^2) on customer count, incremental fixes won\'t help',
        'If quick wins would only reduce time by <20%, may not be worth investment',
      ],
    },
    confirmation: {
      understandsUserPerspective: true,
      understandsTradeoffs: true,
      knowsValidation: true,
    },
    ownerId: 'user-3',
    createdAt: new Date('2026-01-27T11:00:00'),
    updatedAt: new Date('2026-01-27T15:00:00'),
    aiScore: 88,
  },
  // Scenario 4: Feature - In Review
  {
    id: 'frame-4',
    type: 'feature',
    status: 'in_review',
    problemStatement: 'API rate limiting is inconsistent across services, causing unpredictable behavior for clients during traffic spikes.',
    userPerspective: {
      user: 'API Consumer / Integration Developer',
      context: 'Third-party developers integrating with our API need predictable rate limits to build reliable applications.',
      journeySteps: [
        'Developer reads API documentation showing 1000 requests/minute limit',
        'Developer implements retry logic based on documented limits',
        'During peak traffic, some endpoints return 429 at 500 requests while others allow 2000',
        'Developer\'s application fails unpredictably, user experience degrades',
        'Developer opens support ticket asking for clarification',
      ],
      painPoints: [
        'Inconsistent limits across endpoints',
        'Documentation doesn\'t match reality',
        'No clear retry-after headers',
      ],
    },
    engineeringFraming: {
      principles: [
        'Rate limits must be consistent and documented',
        'Clients must receive clear feedback when limited',
        'Limits should be configurable per service',
      ],
      nonGoals: [
        'Not implementing per-user quotas in this phase',
        'Not adding billing integration',
      ],
    },
    validationThinking: {
      successSignals: [
        'All endpoints return consistent 429 responses at documented limits',
        'Retry-After header included in all 429 responses',
        'Load test passes with expected behavior',
      ],
      disconfirmingEvidence: [
        'If any endpoint deviates >5% from documented limit, implementation is incomplete',
      ],
    },
    confirmation: {
      understandsUserPerspective: true,
      understandsTradeoffs: true,
      knowsValidation: true,
    },
    ownerId: 'user-4',
    createdAt: new Date('2026-01-28T10:00:00'),
    updatedAt: new Date('2026-01-29T08:00:00'),
    aiScore: 85,
  },
  // Scenario 5: Bug Fix - Feedback stage (awaiting retrospective)
  {
    id: 'frame-5',
    type: 'bug',
    status: 'feedback',
    problemStatement: 'Login timeout occurs after 30 seconds of inactivity even when user is actively typing their password.',
    userPerspective: {
      user: 'End User',
      context: 'Users with complex passwords or slower typing speed experience session timeouts before completing login.',
      journeySteps: [
        'User navigates to login page',
        'User begins entering password',
        'User pauses to check password manager',
        'Session expires, form resets',
        'User must start over',
      ],
      painPoints: [
        'Frustration with lost input',
        'Particularly affects users with accessibility needs',
      ],
    },
    engineeringFraming: {
      principles: [
        'Timeout should only trigger on true inactivity',
        'Any input activity resets the timer',
      ],
      nonGoals: [
        'Not changing overall session length',
      ],
    },
    validationThinking: {
      successSignals: [
        'Keypress events reset inactivity timer',
        'No reports of premature timeouts',
      ],
      disconfirmingEvidence: [
        'If security team flags risk with extended sessions',
      ],
    },
    confirmation: {
      understandsUserPerspective: true,
      understandsTradeoffs: true,
      knowsValidation: true,
    },
    ownerId: 'user-3',
    createdAt: new Date('2026-01-20T09:00:00'),
    updatedAt: new Date('2026-01-25T14:00:00'),
    aiScore: 82,
  },
  // Scenario 6: Feature - Archived (completed with feedback)
  {
    id: 'frame-6',
    type: 'feature',
    status: 'archived',
    problemStatement: 'Users cannot export their data in CSV format, forcing manual copy-paste for reporting.',
    userPerspective: {
      user: 'Business Analyst',
      context: 'Analysts need to combine platform data with external data sources for quarterly reports.',
      journeySteps: [
        'Analyst needs data for quarterly report',
        'Opens platform dashboard',
        'No export button available',
        'Manually copies data into spreadsheet',
        'Formatting is lost, numbers become text',
      ],
      painPoints: [
        'Manual process takes 2+ hours',
        'Data quality issues from copy-paste',
        'Cannot automate recurring reports',
      ],
    },
    engineeringFraming: {
      principles: [
        'Export should preserve data types',
        'Support for large datasets (>10k rows)',
        'Follow RFC 4180 CSV standard',
      ],
      nonGoals: [
        'Not implementing PDF or Excel formats',
        'Not adding scheduled exports',
      ],
    },
    validationThinking: {
      successSignals: [
        'Export button visible on data tables',
        'CSV opens correctly in Excel',
        'Performance acceptable for 10k+ rows',
      ],
      disconfirmingEvidence: [
        'If Excel shows import errors',
        'If export times out on large datasets',
      ],
    },
    confirmation: {
      understandsUserPerspective: true,
      understandsTradeoffs: true,
      knowsValidation: true,
    },
    ownerId: 'user-4',
    createdAt: new Date('2026-01-10T09:00:00'),
    updatedAt: new Date('2026-01-22T16:00:00'),
    aiScore: 86,
    feedback: {
      outcome: 'success',
      summary: 'CSV export feature shipped successfully. Analysts reported 90% time savings in quarterly reporting workflow.',
      lessonsLearned: [
        'Should have included column header customization based on user feedback',
        'UTF-8 BOM needed for Excel compatibility - discovered late in QA',
        'Consider adding Excel format in future iteration',
      ],
      assumptionResults: [
        {
          assumption: 'RFC 4180 CSV standard would be sufficient',
          wasCorrect: true,
          note: 'Excel, Google Sheets, and Python pandas all parsed correctly',
        },
        {
          assumption: '10k rows would be enough for most users',
          wasCorrect: false,
          note: 'Some power users need 50k+ rows. Added pagination as workaround.',
        },
        {
          assumption: 'Users only need raw data export',
          wasCorrect: true,
          note: 'Confirmed - no requests for formatted reports',
        },
      ],
      completedAt: new Date('2026-01-22T16:00:00'),
    },
  },
];

// Type placeholders for new frames
export const typeDescriptions = {
  bug: {
    title: 'Bug Fix',
    description: 'Something isn\'t working as expected',
    placeholder: 'Describe what\'s broken - what should happen vs. what actually happens?',
  },
  feature: {
    title: 'Feature Development',
    description: 'Adding new functionality with known goals',
    placeholder: 'What capability is missing? What should users be able to do that they can\'t today?',
  },
  exploration: {
    title: 'Exploration',
    description: 'Open-ended research or investigation',
    placeholder: 'What question are you trying to answer? What uncertainty needs to be resolved?',
  },
};

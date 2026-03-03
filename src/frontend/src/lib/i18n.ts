/**
 * Internationalization (i18n) module for Framer UI.
 *
 * Provides a translations dictionary and a React hook `useT()`
 * that reads the current `contentLanguage` from the frame store.
 */

import { useFrameStore } from '@/store';

export type Lang = 'en' | 'zh';

const translations = {
  // ── Navigation / Layout ──────────────────────────────
  'nav.title': { en: 'Framer', zh: 'Framer' },
  'nav.subtitle': { en: 'Pre-dev thinking framework', zh: '开发前思维框架' },
  'nav.project': { en: 'Project', zh: '项目' },
  'nav.noProject': { en: 'No project', zh: '未选择项目' },
  'nav.spaces': { en: 'Spaces', zh: '空间' },
  'nav.workingSpace': { en: 'Working Space', zh: '工作空间' },
  'nav.knowledge': { en: 'Knowledge', zh: '知识库' },
  'nav.archive': { en: 'Archive', zh: '归档' },
  'nav.settings': { en: 'Settings', zh: '设置' },
  'nav.signOut': { en: 'Sign out', zh: '退出登录' },

  // ── Login ────────────────────────────────────────────
  'login.welcomeBack': { en: 'Welcome Back', zh: '欢迎回来' },
  'login.createAccount': { en: 'Create Account', zh: '创建账号' },
  'login.signInDesc': { en: 'Sign in to continue to Framer', zh: '登录以继续使用 Framer' },
  'login.signUpDesc': { en: 'Sign up to start framing your work', zh: '注册以开始框架化你的工作' },
  'login.nameOptional': { en: 'Name (optional)', zh: '姓名（可选）' },
  'login.email': { en: 'Email', zh: '邮箱' },
  'login.password': { en: 'Password', zh: '密码' },
  'login.confirmPassword': { en: 'Confirm Password', zh: '确认密码' },
  'login.signIn': { en: 'Sign In', zh: '登录' },
  'login.signingIn': { en: 'Signing in...', zh: '登录中...' },
  'login.creatingAccount': { en: 'Creating account...', zh: '创建账号中...' },
  'login.noAccount': { en: "Don't have an account?", zh: '还没有账号？' },
  'login.signUp': { en: 'Sign up', zh: '注册' },
  'login.hasAccount': { en: 'Already have an account?', zh: '已有账号？' },
  'login.signInLink': { en: 'Sign in', zh: '登录' },
  'login.passwordsNoMatch': { en: 'Passwords do not match', zh: '密码不一致' },
  'login.yourName': { en: 'Your name', zh: '你的名字' },
  'login.emailPlaceholder': { en: 'you@example.com', zh: 'you@example.com' },
  'login.passwordPlaceholder': { en: 'Enter your password', zh: '输入密码' },
  'login.confirmPlaceholder': { en: 'Confirm your password', zh: '确认密码' },

  // ── Dashboard ────────────────────────────────────────
  'dashboard.newFrame': { en: 'New Frame', zh: '新建框架' },
  'dashboard.allTypes': { en: 'All Types', zh: '全部类型' },
  'dashboard.allOwners': { en: 'All Owners', zh: '全部负责人' },
  'dashboard.searchFrames': { en: 'Search frames...', zh: '搜索框架...' },
  'dashboard.noFrames': { en: 'No frames', zh: '暂无框架' },
  'dashboard.noArchived': { en: 'No archived frames yet.', zh: '暂无归档框架' },
  'dashboard.untitledFrame': { en: 'Untitled Frame', zh: '未命名框架' },
  'dashboard.archived': { en: 'Archived', zh: '已归档' },

  // ── Status Labels ────────────────────────────────────
  'status.draft': { en: 'Draft', zh: '草稿' },
  'status.inReview': { en: 'In Review', zh: '评审中' },
  'status.ready': { en: 'Ready', zh: '就绪' },
  'status.feedback': { en: 'Feedback', zh: '反馈' },
  'status.archived': { en: 'Archived', zh: '已归档' },

  // ── Type Labels ──────────────────────────────────────
  'type.bug': { en: 'Bug Fix', zh: '缺陷修复' },
  'type.feature': { en: 'Feature', zh: '新功能' },
  'type.exploration': { en: 'Exploration', zh: '探索' },

  // ── Frame Sections ───────────────────────────────────
  'section.problemStatement': { en: 'Problem Statement', zh: '问题描述' },
  'section.rootCause': { en: 'Root Cause', zh: '根因分析' },
  'section.userPerspective': { en: 'User Perspective', zh: '用户视角' },
  'section.engineeringFraming': { en: 'Engineering Framing', zh: '工程框架' },
  'section.validationThinking': { en: 'Validation Thinking', zh: '验证思考' },

  // ── New Frame / Conversation ─────────────────────────
  'new.title': { en: 'New Frame', zh: '新建框架' },
  'new.reviewConversation': { en: 'Review Conversation', zh: '评审对话' },
  'new.continueConversation': { en: 'Continue Conversation', zh: '继续对话' },
  'new.describePrompt': { en: "Describe your problem and I'll help you frame it", zh: '描述你的问题，我来帮你框架化' },
  'new.reviewPrompt': { en: 'Discuss this frame with the Review Coach', zh: '与评审教练讨论此框架' },
  'new.continuePrompt': { en: 'Continue refining — re-synthesize to update your frame', zh: '继续完善 — 重新生成以更新你的框架' },
  'new.lockedBanner': { en: 'This conversation is locked because the frame is under review.', zh: '此对话已锁定，因为框架正在评审中。' },
  'new.frameContext': { en: 'Frame Context', zh: '框架上下文' },
  'new.problem': { en: 'Problem', zh: '问题' },
  'new.previewFrame': { en: 'Preview Frame', zh: '预览框架' },
  'new.synthesizeFrame': { en: 'Synthesize Frame', zh: '生成框架' },
  'new.updateFrame': { en: 'Update Frame', zh: '更新框架' },
  'new.summarizeReview': { en: 'Summarize Review', zh: '总结评审' },
  'new.viewFrame': { en: 'View Frame', zh: '查看框架' },
  'new.framePreview': { en: 'Frame Preview', zh: '框架预览' },
  'new.close': { en: 'Close', zh: '关闭' },
  'new.generatingPreview': { en: 'Generating Preview...', zh: '生成预览中...' },
  'new.synthesizing': { en: 'Synthesizing...', zh: '生成中...' },
  'new.updating': { en: 'Updating...', zh: '更新中...' },
  'new.summarizing': { en: 'Summarizing...', zh: '总结中...' },

  // ── Chat Interface ───────────────────────────────────
  'chat.startConversation': { en: 'Start a conversation', zh: '开始对话' },
  'chat.startDesc': { en: "Describe what you're working on. I'll help you frame the problem, understand the user perspective, and define validation criteria.", zh: '描述你正在做的工作。我会帮你框架化问题、理解用户视角并定义验证标准。' },
  'chat.coach': { en: 'Coach', zh: '教练' },
  'chat.reviewCoach': { en: 'Review Coach', zh: '评审教练' },
  'chat.placeholder': { en: "Describe what you're working on...", zh: '描述你正在做的工作...' },
  'chat.failedToSend': { en: 'Failed to send', zh: '发送失败' },
  'chat.retry': { en: 'Retry', zh: '重试' },

  // ── Coverage Panel ───────────────────────────────────
  'coverage.title': { en: 'Discussion Coverage', zh: '讨论覆盖度' },
  'coverage.desc': { en: 'How much of each topic has been discussed', zh: '每个主题的讨论程度' },
  'coverage.gaps': { en: 'Gaps', zh: '未覆盖' },
  'coverage.detectedType': { en: 'Detected type:', zh: '识别类型：' },
  'coverage.problemStatement': { en: 'Problem Statement', zh: '问题描述' },
  'coverage.problemStatementDesc': { en: 'Clear, solution-free problem definition', zh: '清晰的、不包含解决方案的问题定义' },
  'coverage.rootCause': { en: 'Root Cause', zh: '根因分析' },
  'coverage.rootCauseDesc': { en: 'Technical root cause analysis', zh: '技术根因分析' },
  'coverage.userPerspective': { en: 'User Perspective', zh: '用户视角' },
  'coverage.userPerspectiveDesc': { en: 'Who is affected, journey, pain points', zh: '受影响的用户、用户旅程、痛点' },
  'coverage.engineeringFraming': { en: 'Engineering Framing', zh: '工程框架' },
  'coverage.engineeringFramingDesc': { en: 'Principles, trade-offs, non-goals', zh: '原则、权衡、非目标' },
  'coverage.validationThinking': { en: 'Validation Thinking', zh: '验证思考' },
  'coverage.validationThinkingDesc': { en: 'Structured test cases, success criteria', zh: '结构化测试用例、成功标准' },

  // ── Knowledge Page ───────────────────────────────────
  'knowledge.title': { en: 'Knowledge Base', zh: '知识库' },
  'knowledge.subtitle': { en: 'Team patterns, decisions, and lessons learned', zh: '团队模式、决策和经验教训' },
  'knowledge.addKnowledge': { en: 'Add Knowledge', zh: '添加知识' },
  'knowledge.searchPlaceholder': { en: 'Search knowledge semantically...', zh: '语义搜索知识...' },
  'knowledge.search': { en: 'Search', zh: '搜索' },
  'knowledge.all': { en: 'All', zh: '全部' },
  'knowledge.pattern': { en: 'Pattern', zh: '模式' },
  'knowledge.decision': { en: 'Decision', zh: '决策' },
  'knowledge.prediction': { en: 'Prediction', zh: '预测' },
  'knowledge.context': { en: 'Context', zh: '上下文' },
  'knowledge.lesson': { en: 'Lesson', zh: '经验' },
  'knowledge.noMatch': { en: 'No matching knowledge found', zh: '未找到匹配的知识' },
  'knowledge.empty': { en: 'No knowledge entries yet. Add your first one!', zh: '暂无知识条目，添加第一个吧！' },
  'knowledge.addTitle': { en: 'Add Knowledge', zh: '添加知识' },
  'knowledge.addDesc': { en: 'Record a pattern, decision, or lesson for the team', zh: '为团队记录模式、决策或经验教训' },
  'knowledge.titleLabel': { en: 'Title', zh: '标题' },
  'knowledge.titlePlaceholder': { en: 'Short descriptive title', zh: '简短描述性标题' },
  'knowledge.categoryLabel': { en: 'Category', zh: '分类' },
  'knowledge.contentLabel': { en: 'Content', zh: '内容' },
  'knowledge.contentPlaceholder': { en: 'The pattern, decision, or lesson...', zh: '模式、决策或经验教训...' },
  'knowledge.tagsLabel': { en: 'Tags (comma-separated)', zh: '标签（用逗号分隔）' },
  'knowledge.tagsPlaceholder': { en: 'auth, database, performance', zh: '认证, 数据库, 性能' },
  'knowledge.cancel': { en: 'Cancel', zh: '取消' },
  'knowledge.addEntry': { en: 'Add Entry', zh: '添加条目' },
  'knowledge.showing': { en: 'Showing', zh: '显示' },
  'knowledge.of': { en: 'of', zh: '共' },
  'knowledge.source': { en: 'Source:', zh: '来源：' },
  'knowledge.by': { en: 'by', zh: '由' },
  'knowledge.untitled': { en: 'Untitled', zh: '无标题' },
  'knowledge.sourceFeedback': { en: 'Frame Feedback', zh: '框架反馈' },
  'knowledge.sourceConversation': { en: 'Conversation', zh: '对话' },
  'knowledge.sourceManual': { en: 'Manual', zh: '手动' },

  // ── Frame Detail Page ────────────────────────────────
  'frame.loading': { en: 'Loading frame...', zh: '加载框架...' },
  'frame.evaluate': { en: 'Evaluate', zh: '评估' },
  'frame.edit': { en: 'Edit', zh: '编辑' },
  'frame.preview': { en: 'Preview', zh: '预览' },
  'frame.contentQuality': { en: 'Content Quality Score', zh: '内容质量评分' },
  'frame.aiAssessment': { en: 'AI assessment of the written frame content', zh: 'AI 对已编写框架内容的评估' },
  'frame.feedback': { en: 'Feedback', zh: '反馈' },
  'frame.issues': { en: 'Issues', zh: '问题' },
  'frame.noContent': { en: 'No content yet', zh: '暂无内容' },
  'frame.sourceConversation': { en: 'Source Conversation', zh: '源对话' },
  'frame.sourceConversationDesc': { en: 'The discussion that shaped this frame', zh: '形成此框架的讨论' },
  'frame.viewConversation': { en: 'View Conversation', zh: '查看对话' },
  'frame.reviewConversation': { en: 'Review Conversation', zh: '评审对话' },
  'frame.reviewConversationDesc': { en: 'AI-guided review discussion', zh: 'AI 指导的评审讨论' },
  'frame.viewReview': { en: 'View Review', zh: '查看评审' },
  'frame.startReview': { en: 'Start Review Conversation', zh: '开始评审对话' },
  'frame.reviewSummary': { en: 'Review Summary', zh: '评审摘要' },
  'frame.comments': { en: 'Comments', zh: '评论' },
  'frame.versionHistory': { en: 'Version History', zh: '版本历史' },
  'frame.showLess': { en: 'Show less', zh: '收起' },
  'frame.showMore': { en: 'Show {n} more version{s}', zh: '显示更多 {n} 个版本' },
  'frame.owner': { en: 'Owner:', zh: '负责人：' },
  'frame.reviewer': { en: 'Reviewer:', zh: '评审人：' },
  'frame.lastUpdated': { en: 'Last updated:', zh: '最近更新：' },
  'frame.unsaved': { en: 'Unsaved', zh: '未保存' },
  'frame.saved': { en: 'Saved', zh: '已保存' },
  'frame.readyToSubmit': { en: 'Ready to submit for review', zh: '可以提交评审' },
  'frame.underReview': { en: 'Under review - mark as ready when approved', zh: '评审中 - 批准后标记为就绪' },
  'frame.readyForImpl': { en: 'Ready for implementation', zh: '已准备好实施' },
  'frame.implComplete': { en: 'Implementation complete - provide feedback', zh: '实施完成 - 请提供反馈' },
  'frame.archivedFeedback': { en: 'Archived with feedback', zh: '已归档并附反馈' },
  'frame.discard': { en: 'Discard', zh: '丢弃' },
  'frame.saveDraft': { en: 'Save Draft', zh: '保存草稿' },
  'frame.submitForReview': { en: 'Submit for Review', zh: '提交评审' },
  'frame.chooseReviewer': { en: 'Choose reviewer...', zh: '选择评审人...' },
  'frame.confirm': { en: 'Confirm', zh: '确认' },
  'frame.back': { en: 'Back', zh: '返回' },
  'frame.backToDashboard': { en: 'Back to Dashboard', zh: '返回仪表盘' },
  'frame.markAsReady': { en: 'Mark as Ready', zh: '标记为就绪' },
  'frame.startImplementation': { en: 'Start Implementation', zh: '开始实施' },
  'frame.distillingKnowledge': { en: 'Distilling Knowledge...', zh: '提炼知识中...' },
  'frame.extractingInsights': { en: 'Extracting insights from your feedback via AI', zh: '正在通过 AI 从你的反馈中提取洞察' },
  'frame.knowledgeExtracted': { en: 'Knowledge Extracted', zh: '知识已提取' },
  'frame.insightsDistilled': { en: '{n} insight{s} distilled from your feedback and saved to the knowledge base.', zh: '从你的反馈中提炼了 {n} 条洞察并保存到知识库。' },
  'frame.done': { en: 'Done', zh: '完成' },
  'frame.dashboard': { en: 'Dashboard', zh: '仪表盘' },

  // ── Frame Section Placeholders ───────────────────────
  'frame.placeholderBugProblem': { en: "Describe what's broken - what should happen vs. what actually happens?", zh: '描述出了什么问题 - 期望行为 vs 实际行为？' },
  'frame.placeholderFeatureProblem': { en: 'What capability is missing? What should users be able to do?', zh: '缺少什么功能？用户应该能做什么？' },
  'frame.placeholderExplorationProblem': { en: 'What question are you trying to answer? What uncertainty needs to be resolved?', zh: '你试图回答什么问题？需要解决什么不确定性？' },
  'frame.placeholderUserPerspective': { en: 'Describe who is affected, their context, journey, and pain points...', zh: '描述受影响的用户、他们的背景、用户旅程和痛点...' },
  'frame.placeholderEngineering': { en: 'Define key principles, trade-offs, and explicit non-goals...', zh: '定义关键原则、权衡和明确的非目标...' },
  'frame.placeholderValidation': { en: 'Describe success signals and what would disprove your approach...', zh: '描述成功信号以及什么能否定你的方案...' },
  'frame.placeholderRootCause': { en: 'What is the technical root cause? Why did this happen?...', zh: '技术根因是什么？为什么会发生这种情况？...' },

  // ── Frame Section Component ──────────────────────────
  'frameSection.empty': { en: 'Empty', zh: '空' },
  'frameSection.questionnaire': { en: 'Questionnaire', zh: '问卷' },
  'frameSection.comment': { en: 'Comment', zh: '评论' },
  'frameSection.emptyDesc': { en: 'This section is empty. Use the questionnaire to get started, or add content manually.', zh: '此部分为空。使用问卷开始，或手动添加内容。' },
  'frameSection.startQuestionnaire': { en: 'Start Questionnaire', zh: '开始问卷' },
  'frameSection.regenerate': { en: 'Regenerate', zh: '重新生成' },
  'frameSection.improve': { en: 'Improve', zh: '改进' },
  'frameSection.refine': { en: 'Refine...', zh: '完善...' },
  'frameSection.add': { en: 'Add', zh: '添加' },
  'frameSection.save': { en: 'Save', zh: '保存' },
  'frameSection.cancel': { en: 'Cancel', zh: '取消' },
  'frameSection.clickToEdit': { en: 'Click to edit', zh: '点击编辑' },
  'frameSection.clickToAdd': { en: 'Click to add...', zh: '点击添加...' },
  'frameSection.notSpecified': { en: 'Not specified', zh: '未指定' },
  'frameSection.minItems': { en: 'Minimum {n} items required ({m} more needed)', zh: '最少需要 {n} 项（还需 {m} 项）' },

  // ── Feedback Form ────────────────────────────────────
  'feedbackForm.title': { en: 'Implementation Feedback', zh: '实施反馈' },
  'feedbackForm.howDidItGo': { en: 'How did the implementation go?', zh: '实施进展如何？' },
  'feedbackForm.success': { en: 'Success', zh: '成功' },
  'feedbackForm.partial': { en: 'Partial', zh: '部分' },
  'feedbackForm.failed': { en: 'Failed', zh: '失败' },
  'feedbackForm.summary': { en: 'Summary', zh: '摘要' },
  'feedbackForm.summaryPlaceholder': { en: 'Briefly describe what happened during implementation...', zh: '简要描述实施过程中发生了什么...' },
  'feedbackForm.lessons': { en: 'Lessons Learned', zh: '经验教训' },
  'feedbackForm.lessonsOptional': { en: '(one per line, optional)', zh: '（每行一条，可选）' },
  'feedbackForm.lessonsPlaceholder': { en: 'What would you do differently?\nWhat assumptions were wrong?\nWhat worked well?', zh: '你会有什么不同的做法？\n哪些假设是错误的？\n哪些做得好？' },
  'feedbackForm.submitting': { en: 'Submitting...', zh: '提交中...' },
  'feedbackForm.complete': { en: 'Complete with Feedback', zh: '完成并提交反馈' },
  'feedbackForm.hint': { en: 'Select an outcome and write a summary to submit', zh: '选择结果并填写摘要以提交' },

  // ── Settings Modal ───────────────────────────────────
  'settings.title': { en: 'Settings', zh: '设置' },
  'settings.desc': { en: 'Configure your Framer preferences', zh: '配置 Framer 偏好设置' },
  'settings.comingSoon': { en: 'Settings panel coming soon. Backend API is connected.', zh: '设置面板即将推出。后端 API 已连接。' },

  // ── Common / Misc ────────────────────────────────────
  'common.loading': { en: 'Loading...', zh: '加载中...' },
  'common.me': { en: 'Me', zh: '我' },
  'common.teamMember': { en: 'Team Member', zh: '团队成员' },
} as const;

export type TranslationKey = keyof typeof translations;

/**
 * Get the translated string for a given key and language.
 */
export function t(key: TranslationKey, lang: Lang): string {
  const entry = translations[key];
  return entry[lang];
}

/**
 * React hook that returns a translation function bound to the current language.
 *
 * Usage:
 *   const t = useT();
 *   <span>{t('nav.settings')}</span>
 */
export function useT(): (key: TranslationKey) => string {
  const lang = useFrameStore((s) => s.contentLanguage);
  return (key: TranslationKey) => t(key, lang);
}

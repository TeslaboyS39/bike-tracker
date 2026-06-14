---
name: memory-creation
description: Create structured session memory checkpoints to maintain context between Claude Code sessions. Format includes YAML headers, progress tracking, code pointers, technical decisions, and next-session priorities. Designed to minimize token overhead while preserving critical information.
keywords: memory, checkpoint, session-tracking, token-efficiency, yaml, context-persistence
---

# Memory Creation Skill

## Overview

This skill guides creation of **structured session memory files** for maintaining context between Claude Code sessions.

**Format**: YAML frontmatter + Chinese simplified text + code pointers  
**Purpose**: Track progress, decisions, blockers, code checkpoints, and next-session priorities  
**Storage**: `MEMORY/memory-YYYY-MM-DD.md` (one file per session)  
**Language**: Chinese simplified (40% token reduction vs English)

---

## Memory File Structure

### Filename Format
```
memory-YYYY-MM-DD.md
Example: memory-2025-02-01.md
```

### Section 1: Header (YAML Frontmatter)
```yaml
---
session: [number]
date: YYYY-MM-DD
project: [project-name]
status: [IN_PROGRESS | COMPLETED | BLOCKED]
completion: [percentage, e.g., 65%]
---
```

**Fields explained**:
- `session`: Sequential session number for tracking
- `date`: Session date for easy file lookup
- `project`: Your project name (replace with actual)
- `status`: Current milestone status
- `completion`: % of current task/feature complete

---

### Section 2: Completion Summary (Chinese)
```markdown
## 完成情况 (Completion)

✅ 已完成 (Completed):
- Feature/task 1: Brief description (file:line reference)
- Feature/task 2: Brief description
- Feature/task 3: X/Y percent complete

🔄 进行中 (In Progress):
- Current feature: Description (file:line, current status)
- Blocker: Brief description if any

⚠️ 被阻止 (Blocked):
- Reason: Waiting for X / external dependency
```

**Guidelines**:
- List actual work completed, not just planning
- Include file:line references for searchability
- Separate completed, in-progress, and blocked items
- Keep descriptions concise (1-2 lines max)

---

### Section 3: Code Checkpoints (Exact References)
```markdown
## 代码检查点 (Code Checkpoints)

### 上次完成位置 (Last Completed)
- 文件: src/module.ts
- 行号: L450
- 提交: abc123def (commit hash)

### 下次开始位置 (Next Session Start)
- 文件: src/next-module.ts
- 行号: L1
- 任务: "Descriptive task name"
- 预计耗时: X小时
```

**Guidelines**:
- Exact line numbers = searchable with grep/IDE
- Include most recent commit hash
- Describe next task clearly
- Estimate time for next session

---

### Section 4: Issues & Solutions (Chinese)
```markdown
## 问题与解决方案 (Issues & Solutions)

| 问题 | 文件:行号 | 解决方案 | 状态 |
|------|---------|---------|------|
| Issue description | file.ts:89 | Solution applied | ✅ FIXED |
| Bug encountered | file2.ts:120 | Workaround used | 🔄 TESTING |
| Known issue | file3.ts:45 | Waiting for X | ⏳ BLOCKED |
```

**Guidelines**:
- Record actual issues found during session
- Include exact file:line for reproduction
- Document solution applied (or workaround)
- Mark status: FIXED, TESTING, BLOCKED, INVESTIGATING

---

### Section 5: Technical Decisions (Chinese)
```markdown
## 技术决定 (Technical Decisions)

1. **Decision name**: What and why
   - 理由 (Rationale): Why this choice
   - 影响 (Impact): Trade-offs and consequences
   - 依赖 (Dependencies): What it requires

2. **Another decision**: What and why
   - 理由: Why
   - 影响: Consequences
```

**Guidelines**:
- Record significant architectural/design choices
- Document rationale (important for future reference)
- Note impact on performance, cost, maintenance
- Reference any dependencies or requirements

---

### Section 6: Key Metrics (Compact)
```markdown
## 关键指标 (Key Metrics)

- 代码行数: +X (module names)
- 测试覆盖: X% → Y%
- 性能: [metric] X ms → Y ms
- Token花费: ~X,000 (this session)
- Bug发现: X (fixed/testing/blocked breakdown)
```

**Guidelines**:
- Track code changes (lines added/modified)
- Performance improvements if applicable
- Test coverage progression
- Token usage awareness
- Bug discovery count

---

### Section 7: Git Log Summary (最近commits)
```markdown
## 最近提交 (Recent Commits)

- abc123d: "Feature: Implement X"
- def456e: "Fix: Resolve Y issue"
- ghi789f: "Refactor: Improve Z performance"
- jkl012g: "Chore: Update documentation"
```

**Guidelines**:
- Include 4-8 most recent commits
- Use actual commit hashes (short form: 7 chars)
- Keep messages concise (copy from git log)
- Let git be source of truth for detailed history

---

### Section 8: Dependencies & Blockers (If Any)
```markdown
## 依赖与阻碍 (Dependencies & Blockers)

### 等待中 (Waiting For):
- [ ] Code review: PR #123 (target: YYYY-MM-DD)
- [ ] External dependency: Library X v2.0 (expected: YYYY-MM-DD)
- [ ] CTO/Manager approval: Architectural decision (target: YYYY-MM-DD)

### 外部依赖 (External Dependencies):
- Service X access (status: ✅ confirmed)
- Database Y setup (status: ✅ ready)
- API Z credentials (status: ❌ pending)
```

**Guidelines**:
- List external blockers that impact next session
- Include target dates for reviews/approvals
- Track external service/resource status
- Separate internal vs external dependencies

---

### Section 9: Next Session Priorities (Chinese)
```markdown
## 下次会话优先事项 (Next Session Priorities)

1. **高优先级 (CRITICAL)**
   - Task 1 (why critical)
   - 预计: X小时

2. **中优先级 (MEDIUM)**
   - Task 2 (can wait if needed)
   - 预计: Y小时

3. **低优先级 (LOW)**
   - Task 3 (nice to have)
   - 预计: Z小时

### 预计总耗时: X-Y小时
### 预计完成日期: YYYY-MM-DD
```

**Guidelines**:
- Prioritize realistically
- Break down into actionable tasks
- Estimate time per task
- Include completion target date
- Focus on 3-5 key priorities

---

### Section 10: Quick Reference (Fast Lookup)
```markdown
## 快速参考 (Quick Lookup)

**当前任务**: [What are you currently doing]
**进度**: [X% complete]
**关键文件**: [src/file1.ts, src/file2.ts, src/file3.ts]
**主要工具/库**: [Tool A, Library B, Service C]
**关键决定**: [Most important decision from this session]
**潜在风险**: [What could go wrong, what to watch for]
```

**Guidelines**:
- Current working task (one sentence)
- Overall progress percentage
- 3-5 key files being modified
- Tech stack/tools currently in use
- Critical architecture decision
- Known risks or gotchas

---

## Usage Guidelines

### When to Create Memory
- **End of every session** (best practice)
- **After completing major features** (checkpoint)
- **Before system restart** (prevent context loss)
- **When taking extended break** (days off)

### What to Include
✅ **DO include**:
- Exact file:line references (enable searchability)
- Concrete progress metrics (not vague)
- Actual blockers and dependencies
- Next session's exact starting point
- Technical decisions made
- Issues encountered and solutions

❌ **DON'T include**:
- Long narrative paragraphs (use concise Chinese instead)
- Redundant information (don't repeat)
- Fully resolved issues (archive separately)
- Personal notes (keep professional)
- Irrelevant debugging attempts

### Token Efficiency Tips
1. **Use Chinese simplified** for text (saves ~40% tokens)
2. **Use YAML** for structure (saves ~30% tokens)
3. **Use code pointers** (file:line) instead of describing (avoid prose)
4. **Use tables** for complex data (compact format)
5. **Reference commits** instead of explaining (let git be source)
6. **Keep sections concise** (1-3 lines per item)

### File Management
- **Storage**: Keep memory files in `MEMORY/memory-YYYY-MM-DD.md`
- **Archive**: Move completed sessions to `MEMORY/archive/`
- **Current**: Link or update `MEMORY/current.md` → latest session
- **Version Control**: Commit memory files to git (they're project knowledge)

---

## Minimal Example (Generic Project)

```markdown
---
session: 1
date: 2025-02-01
project: my-project
status: IN_PROGRESS
completion: 40%
---

## 完成情况

✅ 已完成:
- User authentication (src/auth/login.ts:L1-L80)
- Database schema (migrations/001_users.sql)

🔄 进行中:
- API endpoints (src/api/users.ts:L50-L120, 6/10 done)

⚠️ 被阻止:
- Payment integration (awaiting API key from vendor)

## 代码检查点

### 上次完成
- 文件: src/auth/login.ts
- 行号: L80
- 提交: abc1234

### 下次开始
- 文件: src/api/users.ts
- 行号: L50
- 任务: "Implement remaining 4 API endpoints"
- 预计耗时: 3小时

## 问题与解决

| 问题 | 位置 | 解决 | 状态 |
|------|------|------|------|
| Login timeout | auth/login.ts:45 | Increase timeout | ✅ |
| DB connection | db/client.ts:20 | Add retry logic | 🔄 |

## 技术决定

1. **Authentication**: JWT tokens
   - 理由: Stateless, scalable
   - 影响: Security requires HTTPS

## 关键指标

- 代码行数: +350
- 测试覆盖: 45% → 60%
- Token花费: ~8,000

## 最近提交

- abc1234: "Add user authentication"
- def5678: "Create database schema"

## 下次会话优先事项

1. **高优先级**: Complete API endpoints (3h)
2. **中优先级**: Write unit tests (2h)

### 预计完成日期: 2025-02-02
```

---

## Integration with Claude Code

### How to Trigger
```
"Create session memory checkpoint with @memory-creation skill"

or

"Save progress to MEMORY/memory-[date].md using @memory-creation"
```

### What Happens
1. I extract session data from conversation history
2. Identify completed work, blockers, next steps
3. Generate memory file using this skill's structure
4. Save to specified path with today's date
5. Provide summary for your review

### Next Session
```
"Load memory from MEMORY/memory-[latest-date].md"
```
I'll have full context without re-reading entire project!

---

## Best Practices

1. **Be specific**: Use exact file names, line numbers, commit hashes
2. **Keep it concise**: 1-2 lines per item, Chinese for efficiency
3. **Update at session end**: Don't forget before closing
4. **Commit to git**: Memory files are project knowledge, version them
5. **Archive old sessions**: Move to MEMORY/archive after 1-2 weeks
6. **Use for onboarding**: New team member can read recent memory files

---

## Tips for Continuous Improvement

- Review memory from previous session at start of new session
- Refine sections based on what was useful vs not
- Adjust Chinese descriptions if they're too verbose
- Add custom sections if needed (e.g., performance metrics specific to your project)
- This skill itself evolves as you use it

---

## Notes

- Memory files are **version-controllable** (commit them to git!)
- **Chinese simplified** reduces storage and token usage by ~40%
- **YAML headers** enable automation and parsing
- **Code pointers** (file:line) make memory searchable via grep/IDE
- This skill is **generic** - adapt sections to your specific project needs

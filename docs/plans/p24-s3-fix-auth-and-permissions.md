# P24-S3: Fix Auth & Permissions

Fix two permission issues before completing API endpoints and MCP server.

## 1. Project Actions Require Admin Role

`updateProjectAction` and `deleteProjectAction` in `src/app/app/actions.ts` currently use `getAuthUser()` and pass `user.id` to the service layer. Any authenticated user who knows the project ID could potentially call these.

These actions should be restricted to project workers with the `admin` role.

### Approach

- Add `requireAdminProjectWorker(projectId)` in `src/server/auth/utils.ts`
  - Wraps `requireProjectWorker(projectId)` and checks `projectWorker.role === 'admin'`
  - Throws if not admin
- Update `updateProjectAction` and `deleteProjectAction` to use `requireAdminProjectWorker` instead of `getAuthUser`
- The `updateProject` and `deleteProject` service functions may need signature changes to accept `projectWorkerId` instead of `userId`

## 2. Log Creation Ownership Check Is Too Restrictive

`createLog` in `src/server/services/log.ts` validates that the issue belongs to the calling project worker (`eq(issues.projectWorkerId, projectWorkerId)`). This means only the worker who created the issue can add logs to it.

The intended behavior: any project worker can leave a log on any issue in the project. The `projectWorkerId` param should only determine who is writing the log, not gate access.

### Approach

- Change the issue validation in `createLog` to check `eq(issues.projectId, data.projectId)` and `eq(issues.id, data.issueId)` instead of checking `issues.projectWorkerId`
- This ensures the issue exists in the project, without restricting who can log

## Tasks

- [x] Add `requireAdminProjectWorker` to `src/server/auth/utils.ts`
- [x] Update `updateProjectAction` and `deleteProjectAction` to use it
- [x] Adjust `updateProject` / `deleteProject` service signatures — removed `userId` param, scope by `projectId` only
- [x] Fix `createLog` issue ownership check to allow any project worker
- [x] Verify with `npx tsc`

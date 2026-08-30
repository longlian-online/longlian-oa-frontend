# API 缓存摘要

来源：https://sit.neo.oa.api.longlian.online/v3/api-docs
更新时间：2026-08-30T17:04:04.850Z

## 文档分组

| 分组       | 路径数 | 接口数 | 缓存文件                  |
| ---------- | ------ | ------ | ------------------------- |
| 全部       | 61     | 73     | `openapi/全部.json`       |
| 公共端     | 2      | 3      | `openapi/公共端.json`     |
| 用户端     | 32     | 37     | `openapi/用户端.json`     |
| 管理端     | 8      | 10     | `openapi/管理端.json`     |
| 组织管理端 | 19     | 23     | `openapi/组织管理端.json` |

## 接口索引

| 分组       | 方法   | 路径                                                    | 摘要                             | 缓存文件                                                                             |
| ---------- | ------ | ------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------ |
| 全部       | GET    | `/admin/admins/`                                        | 分页查询管理员列表               | `operations/全部_get_-admin-admins.json`                                             |
| 全部       | POST   | `/admin/admins/`                                        | 创建管理员                       | `operations/全部_post_-admin-admins.json`                                            |
| 全部       | DELETE | `/admin/admins/{id}`                                    | 删除管理员                       | `operations/全部_delete_-admin-admins-id.json`                                       |
| 全部       | GET    | `/admin/organizations/`                                 | 分页查询组织列表                 | `operations/全部_get_-admin-organizations.json`                                      |
| 全部       | PATCH  | `/admin/organizations/{orgId}/status`                   | 操作组织状态                     | `operations/全部_patch_-admin-organizations-orgid-status.json`                       |
| 全部       | POST   | `/admin/organizations/invite-codes/create-org`          | 生成邀请码（超管）               | `operations/全部_post_-admin-organizations-invite-codes-create-org.json`             |
| 全部       | GET    | `/admin/scheduled-tasks/`                               | 列出所有已注册的定时任务         | `operations/全部_get_-admin-scheduled-tasks.json`                                    |
| 全部       | POST   | `/admin/scheduled-tasks/{taskName}/trigger`             | 手动触发定时任务                 | `operations/全部_post_-admin-scheduled-tasks-taskname-trigger.json`                  |
| 全部       | DELETE | `/admin/session`                                        | 管理员登出                       | `operations/全部_delete_-admin-session.json`                                         |
| 全部       | POST   | `/admin/session`                                        | 管理员登录                       | `operations/全部_post_-admin-session.json`                                           |
| 全部       | GET    | `/app/item/{itemId}/flow`                               | 获取项目任务流（含节点执行状态） | `operations/全部_get_-app-item-itemid-flow.json`                                     |
| 全部       | GET    | `/app/projects`                                         | 分页查询企划列表                 | `operations/全部_get_-app-projects.json`                                             |
| 全部       | POST   | `/app/projects`                                         | 创建企划                         | `operations/全部_post_-app-projects.json`                                            |
| 全部       | GET    | `/app/projects/{projectId}`                             | 获取企划详情                     | `operations/全部_get_-app-projects-projectid.json`                                   |
| 全部       | PUT    | `/app/projects/{projectId}`                             | 编辑企划                         | `operations/全部_put_-app-projects-projectid.json`                                   |
| 全部       | GET    | `/app/projects/{projectId}/items`                       | 分页查询项目列表                 | `operations/全部_get_-app-projects-projectid-items.json`                             |
| 全部       | POST   | `/app/projects/{projectId}/items`                       | 创建项目                         | `operations/全部_post_-app-projects-projectid-items.json`                            |
| 全部       | DELETE | `/app/projects/{projectId}/items/{itemId}`              | 删除项目                         | `operations/全部_delete_-app-projects-projectid-items-itemid.json`                   |
| 全部       | PATCH  | `/app/projects/{projectId}/items/{itemId}/publish`      | 公布项目                         | `operations/全部_patch_-app-projects-projectid-items-itemid-publish.json`            |
| 全部       | DELETE | `/app/projects/{projectId}/workshop`                    | 从工坊移除企划                   | `operations/全部_delete_-app-projects-projectid-workshop.json`                       |
| 全部       | POST   | `/app/projects/{projectId}/workshop`                    | 添加企划到工坊                   | `operations/全部_post_-app-projects-projectid-workshop.json`                         |
| 全部       | GET    | `/app/projects/types`                                   | 获取企划类型列表                 | `operations/全部_get_-app-projects-types.json`                                       |
| 全部       | DELETE | `/app/session/`                                         | 退出登录                         | `operations/全部_delete_-app-session.json`                                           |
| 全部       | POST   | `/app/session/email`                                    | 验证码登录                       | `operations/全部_post_-app-session-email.json`                                       |
| 全部       | POST   | `/app/session/email/code`                               | 发送邮箱验证码                   | `operations/全部_post_-app-session-email-code.json`                                  |
| 全部       | POST   | `/app/session/pwd`                                      | 密码登录                         | `operations/全部_post_-app-session-pwd.json`                                         |
| 全部       | GET    | `/app/task-template/options`                            | 获取用户可选流程模板             | `operations/全部_get_-app-task-template-options.json`                                |
| 全部       | POST   | `/app/task/instance/{instanceId}/abandon`               | 放弃任务                         | `operations/全部_post_-app-task-instance-instanceid-abandon.json`                    |
| 全部       | POST   | `/app/task/instance/{instanceId}/claim`                 | 接取任务                         | `operations/全部_post_-app-task-instance-instanceid-claim.json`                      |
| 全部       | GET    | `/app/task/instance/{instanceId}/detail`                | 查看任务实例详情                 | `operations/全部_get_-app-task-instance-instanceid-detail.json`                      |
| 全部       | POST   | `/app/task/instance/{instanceId}/reject`                | 打回任务                         | `operations/全部_post_-app-task-instance-instanceid-reject.json`                     |
| 全部       | POST   | `/app/task/instance/{instanceId}/reset`                 | 重置任务提交                     | `operations/全部_post_-app-task-instance-instanceid-reset.json`                      |
| 全部       | POST   | `/app/task/instance/{instanceId}/submit`                | 提交任务                         | `operations/全部_post_-app-task-instance-instanceid-submit.json`                     |
| 全部       | GET    | `/app/task/instance/item/{itemId}`                      | 查询项目下的任务实例列表         | `operations/全部_get_-app-task-instance-item-itemid.json`                            |
| 全部       | GET    | `/app/user/`                                            | 获取当前登录用户信息             | `operations/全部_get_-app-user.json`                                                 |
| 全部       | PUT    | `/app/user/`                                            | 更新当前用户信息                 | `operations/全部_put_-app-user.json`                                                 |
| 全部       | GET    | `/app/user/organizations`                               | 获取用户加入的组织列表           | `operations/全部_get_-app-user-organizations.json`                                   |
| 全部       | POST   | `/app/user/organizations/join-by-invite`                | 已注册用户通过邀请码加入组织     | `operations/全部_post_-app-user-organizations-join-by-invite.json`                   |
| 全部       | PUT    | `/app/user/password`                                    | 找回密码                         | `operations/全部_put_-app-user-password.json`                                        |
| 全部       | POST   | `/app/user/register/create-organization`                | 通过邀请码注册并创建组织         | `operations/全部_post_-app-user-register-create-organization.json`                   |
| 全部       | POST   | `/app/user/register/join-organization`                  | 通过邀请码注册并加入组织         | `operations/全部_post_-app-user-register-join-organization.json`                     |
| 全部       | GET    | `/app/user/register/join-organization/invite-info`      | 获取加入组织邀请码对应的组织信息 | `operations/全部_get_-app-user-register-join-organization-invite-info.json`          |
| 全部       | POST   | `/app/user/switch`                                      | 切换组织                         | `operations/全部_post_-app-user-switch.json`                                         |
| 全部       | POST   | `/app/workshop/list`                                    | 分页查询工坊企划列表             | `operations/全部_post_-app-workshop-list.json`                                       |
| 全部       | POST   | `/app/workshop/task-template`                           | 创建工坊个人任务流模板           | `operations/全部_post_-app-workshop-task-template.json`                              |
| 全部       | PUT    | `/app/workshop/task-template/{templateId}`              | 更新工坊个人任务流模板           | `operations/全部_put_-app-workshop-task-template-templateid.json`                    |
| 全部       | POST   | `/app/workshop/task-template/list`                      | 分页查询工坊任务流模板列表       | `operations/全部_post_-app-workshop-task-template-list.json`                         |
| 全部       | GET    | `/common/file/local`                                    | 读取本地文件                     | `operations/全部_get_-common-file-local.json`                                        |
| 全部       | PUT    | `/common/file/local`                                    | 本地上传文件                     | `operations/全部_put_-common-file-local.json`                                        |
| 全部       | POST   | `/common/file/upload`                                   | 创建文件上传                     | `operations/全部_post_-common-file-upload.json`                                      |
| 全部       | POST   | `/orgadmin/members`                                     | 分页查询组员列表                 | `operations/全部_post_-orgadmin-members.json`                                        |
| 全部       | GET    | `/orgadmin/members/{memberId}/base-tasks/submit-counts` | 查询组员各原子任务提交数         | `operations/全部_get_-orgadmin-members-memberid-base-tasks-submit-counts.json`       |
| 全部       | PATCH  | `/orgadmin/members/{memberId}/status`                   | 启用/禁用组员                    | `operations/全部_patch_-orgadmin-members-memberid-status.json`                       |
| 全部       | POST   | `/orgadmin/members/applications`                        | 分页查询待审核入组申请列表       | `operations/全部_post_-orgadmin-members-applications.json`                           |
| 全部       | PUT    | `/orgadmin/members/applications/{applicationId}/review` | 审核入组申请                     | `operations/全部_put_-orgadmin-members-applications-applicationid-review.json`       |
| 全部       | POST   | `/orgadmin/members/invite-codes/join-org`               | 生成加入组织邀请码（管理员）     | `operations/全部_post_-orgadmin-members-invite-codes-join-org.json`                  |
| 全部       | GET    | `/orgadmin/organizations`                               | 获取组织信息                     | `operations/全部_get_-orgadmin-organizations.json`                                   |
| 全部       | PUT    | `/orgadmin/organizations`                               | 更新组织信息                     | `operations/全部_put_-orgadmin-organizations.json`                                   |
| 全部       | GET    | `/orgadmin/project-types`                               | 分页查询企划类型列表             | `operations/全部_get_-orgadmin-project-types.json`                                   |
| 全部       | POST   | `/orgadmin/project-types`                               | 创建企划类型                     | `operations/全部_post_-orgadmin-project-types.json`                                  |
| 全部       | DELETE | `/orgadmin/project-types/{typeId}`                      | 删除企划类型                     | `operations/全部_delete_-orgadmin-project-types-typeid.json`                         |
| 全部       | PUT    | `/orgadmin/project-types/{typeId}`                      | 修改企划类型名称                 | `operations/全部_put_-orgadmin-project-types-typeid.json`                            |
| 全部       | PATCH  | `/orgadmin/project-types/{typeId}/status`               | 启用/禁用企划类型                | `operations/全部_patch_-orgadmin-project-types-typeid-status.json`                   |
| 全部       | POST   | `/orgadmin/projects`                                    | 管理端分页查询企划列表           | `operations/全部_post_-orgadmin-projects.json`                                       |
| 全部       | PATCH  | `/orgadmin/projects/{projectId}/status`                 | 启用/禁用企划                    | `operations/全部_patch_-orgadmin-projects-projectid-status.json`                     |
| 全部       | POST   | `/orgadmin/task/base`                                   | 创建原子任务                     | `operations/全部_post_-orgadmin-task-base.json`                                      |
| 全部       | PATCH  | `/orgadmin/task/base/{taskId}/status`                   | 启用/禁用原子任务                | `operations/全部_patch_-orgadmin-task-base-taskid-status.json`                       |
| 全部       | POST   | `/orgadmin/task/base/list`                              | 分页查询原子任务列表             | `operations/全部_post_-orgadmin-task-base-list.json`                                 |
| 全部       | POST   | `/orgadmin/task/template`                               | 创建任务模板                     | `operations/全部_post_-orgadmin-task-template.json`                                  |
| 全部       | GET    | `/orgadmin/task/template/{templateId}`                  | 获取任务模板详情                 | `operations/全部_get_-orgadmin-task-template-templateid.json`                        |
| 全部       | PUT    | `/orgadmin/task/template/{templateId}`                  | 更新任务模板                     | `operations/全部_put_-orgadmin-task-template-templateid.json`                        |
| 全部       | PATCH  | `/orgadmin/task/template/{templateId}/status`           | 启用/禁用任务模板                | `operations/全部_patch_-orgadmin-task-template-templateid-status.json`               |
| 全部       | POST   | `/orgadmin/task/template/list`                          | 分页查询任务模板列表             | `operations/全部_post_-orgadmin-task-template-list.json`                             |
| 公共端     | GET    | `/common/file/local`                                    | 读取本地文件                     | `operations/公共端_get_-common-file-local.json`                                      |
| 公共端     | PUT    | `/common/file/local`                                    | 本地上传文件                     | `operations/公共端_put_-common-file-local.json`                                      |
| 公共端     | POST   | `/common/file/upload`                                   | 创建文件上传                     | `operations/公共端_post_-common-file-upload.json`                                    |
| 用户端     | GET    | `/app/item/{itemId}/flow`                               | 获取项目任务流（含节点执行状态） | `operations/用户端_get_-app-item-itemid-flow.json`                                   |
| 用户端     | GET    | `/app/projects`                                         | 分页查询企划列表                 | `operations/用户端_get_-app-projects.json`                                           |
| 用户端     | POST   | `/app/projects`                                         | 创建企划                         | `operations/用户端_post_-app-projects.json`                                          |
| 用户端     | GET    | `/app/projects/{projectId}`                             | 获取企划详情                     | `operations/用户端_get_-app-projects-projectid.json`                                 |
| 用户端     | PUT    | `/app/projects/{projectId}`                             | 编辑企划                         | `operations/用户端_put_-app-projects-projectid.json`                                 |
| 用户端     | GET    | `/app/projects/{projectId}/items`                       | 分页查询项目列表                 | `operations/用户端_get_-app-projects-projectid-items.json`                           |
| 用户端     | POST   | `/app/projects/{projectId}/items`                       | 创建项目                         | `operations/用户端_post_-app-projects-projectid-items.json`                          |
| 用户端     | DELETE | `/app/projects/{projectId}/items/{itemId}`              | 删除项目                         | `operations/用户端_delete_-app-projects-projectid-items-itemid.json`                 |
| 用户端     | PATCH  | `/app/projects/{projectId}/items/{itemId}/publish`      | 公布项目                         | `operations/用户端_patch_-app-projects-projectid-items-itemid-publish.json`          |
| 用户端     | DELETE | `/app/projects/{projectId}/workshop`                    | 从工坊移除企划                   | `operations/用户端_delete_-app-projects-projectid-workshop.json`                     |
| 用户端     | POST   | `/app/projects/{projectId}/workshop`                    | 添加企划到工坊                   | `operations/用户端_post_-app-projects-projectid-workshop.json`                       |
| 用户端     | GET    | `/app/projects/types`                                   | 获取企划类型列表                 | `operations/用户端_get_-app-projects-types.json`                                     |
| 用户端     | DELETE | `/app/session/`                                         | 退出登录                         | `operations/用户端_delete_-app-session.json`                                         |
| 用户端     | POST   | `/app/session/email`                                    | 验证码登录                       | `operations/用户端_post_-app-session-email.json`                                     |
| 用户端     | POST   | `/app/session/email/code`                               | 发送邮箱验证码                   | `operations/用户端_post_-app-session-email-code.json`                                |
| 用户端     | POST   | `/app/session/pwd`                                      | 密码登录                         | `operations/用户端_post_-app-session-pwd.json`                                       |
| 用户端     | GET    | `/app/task-template/options`                            | 获取用户可选流程模板             | `operations/用户端_get_-app-task-template-options.json`                              |
| 用户端     | POST   | `/app/task/instance/{instanceId}/abandon`               | 放弃任务                         | `operations/用户端_post_-app-task-instance-instanceid-abandon.json`                  |
| 用户端     | POST   | `/app/task/instance/{instanceId}/claim`                 | 接取任务                         | `operations/用户端_post_-app-task-instance-instanceid-claim.json`                    |
| 用户端     | GET    | `/app/task/instance/{instanceId}/detail`                | 查看任务实例详情                 | `operations/用户端_get_-app-task-instance-instanceid-detail.json`                    |
| 用户端     | POST   | `/app/task/instance/{instanceId}/reject`                | 打回任务                         | `operations/用户端_post_-app-task-instance-instanceid-reject.json`                   |
| 用户端     | POST   | `/app/task/instance/{instanceId}/reset`                 | 重置任务提交                     | `operations/用户端_post_-app-task-instance-instanceid-reset.json`                    |
| 用户端     | POST   | `/app/task/instance/{instanceId}/submit`                | 提交任务                         | `operations/用户端_post_-app-task-instance-instanceid-submit.json`                   |
| 用户端     | GET    | `/app/task/instance/item/{itemId}`                      | 查询项目下的任务实例列表         | `operations/用户端_get_-app-task-instance-item-itemid.json`                          |
| 用户端     | GET    | `/app/user/`                                            | 获取当前登录用户信息             | `operations/用户端_get_-app-user.json`                                               |
| 用户端     | PUT    | `/app/user/`                                            | 更新当前用户信息                 | `operations/用户端_put_-app-user.json`                                               |
| 用户端     | GET    | `/app/user/organizations`                               | 获取用户加入的组织列表           | `operations/用户端_get_-app-user-organizations.json`                                 |
| 用户端     | POST   | `/app/user/organizations/join-by-invite`                | 已注册用户通过邀请码加入组织     | `operations/用户端_post_-app-user-organizations-join-by-invite.json`                 |
| 用户端     | PUT    | `/app/user/password`                                    | 找回密码                         | `operations/用户端_put_-app-user-password.json`                                      |
| 用户端     | POST   | `/app/user/register/create-organization`                | 通过邀请码注册并创建组织         | `operations/用户端_post_-app-user-register-create-organization.json`                 |
| 用户端     | POST   | `/app/user/register/join-organization`                  | 通过邀请码注册并加入组织         | `operations/用户端_post_-app-user-register-join-organization.json`                   |
| 用户端     | GET    | `/app/user/register/join-organization/invite-info`      | 获取加入组织邀请码对应的组织信息 | `operations/用户端_get_-app-user-register-join-organization-invite-info.json`        |
| 用户端     | POST   | `/app/user/switch`                                      | 切换组织                         | `operations/用户端_post_-app-user-switch.json`                                       |
| 用户端     | POST   | `/app/workshop/list`                                    | 分页查询工坊企划列表             | `operations/用户端_post_-app-workshop-list.json`                                     |
| 用户端     | POST   | `/app/workshop/task-template`                           | 创建工坊个人任务流模板           | `operations/用户端_post_-app-workshop-task-template.json`                            |
| 用户端     | PUT    | `/app/workshop/task-template/{templateId}`              | 更新工坊个人任务流模板           | `operations/用户端_put_-app-workshop-task-template-templateid.json`                  |
| 用户端     | POST   | `/app/workshop/task-template/list`                      | 分页查询工坊任务流模板列表       | `operations/用户端_post_-app-workshop-task-template-list.json`                       |
| 管理端     | GET    | `/admin/admins/`                                        | 分页查询管理员列表               | `operations/管理端_get_-admin-admins.json`                                           |
| 管理端     | POST   | `/admin/admins/`                                        | 创建管理员                       | `operations/管理端_post_-admin-admins.json`                                          |
| 管理端     | DELETE | `/admin/admins/{id}`                                    | 删除管理员                       | `operations/管理端_delete_-admin-admins-id.json`                                     |
| 管理端     | GET    | `/admin/organizations/`                                 | 分页查询组织列表                 | `operations/管理端_get_-admin-organizations.json`                                    |
| 管理端     | PATCH  | `/admin/organizations/{orgId}/status`                   | 操作组织状态                     | `operations/管理端_patch_-admin-organizations-orgid-status.json`                     |
| 管理端     | POST   | `/admin/organizations/invite-codes/create-org`          | 生成邀请码（超管）               | `operations/管理端_post_-admin-organizations-invite-codes-create-org.json`           |
| 管理端     | GET    | `/admin/scheduled-tasks/`                               | 列出所有已注册的定时任务         | `operations/管理端_get_-admin-scheduled-tasks.json`                                  |
| 管理端     | POST   | `/admin/scheduled-tasks/{taskName}/trigger`             | 手动触发定时任务                 | `operations/管理端_post_-admin-scheduled-tasks-taskname-trigger.json`                |
| 管理端     | DELETE | `/admin/session`                                        | 管理员登出                       | `operations/管理端_delete_-admin-session.json`                                       |
| 管理端     | POST   | `/admin/session`                                        | 管理员登录                       | `operations/管理端_post_-admin-session.json`                                         |
| 组织管理端 | POST   | `/orgadmin/members`                                     | 分页查询组员列表                 | `operations/组织管理端_post_-orgadmin-members.json`                                  |
| 组织管理端 | GET    | `/orgadmin/members/{memberId}/base-tasks/submit-counts` | 查询组员各原子任务提交数         | `operations/组织管理端_get_-orgadmin-members-memberid-base-tasks-submit-counts.json` |
| 组织管理端 | PATCH  | `/orgadmin/members/{memberId}/status`                   | 启用/禁用组员                    | `operations/组织管理端_patch_-orgadmin-members-memberid-status.json`                 |
| 组织管理端 | POST   | `/orgadmin/members/applications`                        | 分页查询待审核入组申请列表       | `operations/组织管理端_post_-orgadmin-members-applications.json`                     |
| 组织管理端 | PUT    | `/orgadmin/members/applications/{applicationId}/review` | 审核入组申请                     | `operations/组织管理端_put_-orgadmin-members-applications-applicationid-review.json` |
| 组织管理端 | POST   | `/orgadmin/members/invite-codes/join-org`               | 生成加入组织邀请码（管理员）     | `operations/组织管理端_post_-orgadmin-members-invite-codes-join-org.json`            |
| 组织管理端 | GET    | `/orgadmin/organizations`                               | 获取组织信息                     | `operations/组织管理端_get_-orgadmin-organizations.json`                             |
| 组织管理端 | PUT    | `/orgadmin/organizations`                               | 更新组织信息                     | `operations/组织管理端_put_-orgadmin-organizations.json`                             |
| 组织管理端 | GET    | `/orgadmin/project-types`                               | 分页查询企划类型列表             | `operations/组织管理端_get_-orgadmin-project-types.json`                             |
| 组织管理端 | POST   | `/orgadmin/project-types`                               | 创建企划类型                     | `operations/组织管理端_post_-orgadmin-project-types.json`                            |
| 组织管理端 | DELETE | `/orgadmin/project-types/{typeId}`                      | 删除企划类型                     | `operations/组织管理端_delete_-orgadmin-project-types-typeid.json`                   |
| 组织管理端 | PUT    | `/orgadmin/project-types/{typeId}`                      | 修改企划类型名称                 | `operations/组织管理端_put_-orgadmin-project-types-typeid.json`                      |
| 组织管理端 | PATCH  | `/orgadmin/project-types/{typeId}/status`               | 启用/禁用企划类型                | `operations/组织管理端_patch_-orgadmin-project-types-typeid-status.json`             |
| 组织管理端 | POST   | `/orgadmin/projects`                                    | 管理端分页查询企划列表           | `operations/组织管理端_post_-orgadmin-projects.json`                                 |
| 组织管理端 | PATCH  | `/orgadmin/projects/{projectId}/status`                 | 启用/禁用企划                    | `operations/组织管理端_patch_-orgadmin-projects-projectid-status.json`               |
| 组织管理端 | POST   | `/orgadmin/task/base`                                   | 创建原子任务                     | `operations/组织管理端_post_-orgadmin-task-base.json`                                |
| 组织管理端 | PATCH  | `/orgadmin/task/base/{taskId}/status`                   | 启用/禁用原子任务                | `operations/组织管理端_patch_-orgadmin-task-base-taskid-status.json`                 |
| 组织管理端 | POST   | `/orgadmin/task/base/list`                              | 分页查询原子任务列表             | `operations/组织管理端_post_-orgadmin-task-base-list.json`                           |
| 组织管理端 | POST   | `/orgadmin/task/template`                               | 创建任务模板                     | `operations/组织管理端_post_-orgadmin-task-template.json`                            |
| 组织管理端 | GET    | `/orgadmin/task/template/{templateId}`                  | 获取任务模板详情                 | `operations/组织管理端_get_-orgadmin-task-template-templateid.json`                  |
| 组织管理端 | PUT    | `/orgadmin/task/template/{templateId}`                  | 更新任务模板                     | `operations/组织管理端_put_-orgadmin-task-template-templateid.json`                  |
| 组织管理端 | PATCH  | `/orgadmin/task/template/{templateId}/status`           | 启用/禁用任务模板                | `operations/组织管理端_patch_-orgadmin-task-template-templateid-status.json`         |
| 组织管理端 | POST   | `/orgadmin/task/template/list`                          | 分页查询任务模板列表             | `operations/组织管理端_post_-orgadmin-task-template-list.json`                       |

## 使用方式

- 更新缓存：`vp run api:update`
- 检查缓存：`vp run api:check`
- 跳过提交前检查：`SKIP_API_CACHE_CHECK=1 git commit ...`

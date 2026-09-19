<!--
实现决策记录：组织邀请码生成后需要在页面刷新时继续展示。
由于当前 Swagger 未提供查询已生成邀请码的接口，本地使用 sessionStorage 暂存邀请码，
在保证刷新体验的同时避免使用 localStorage 造成邀请码长期留存。
-->

# 项目实现记录

## 组织邀请码刷新保留

- 组织管理员生成的加入组织邀请码使用 `sessionStorage` 暂存，页面刷新后恢复展示。
- 不使用 `localStorage`，避免邀请码在浏览器中长期保留。
- 缓存键为 `organization-admin:join-invite`，重新生成时覆盖旧值，关闭浏览器标签页后自动清除。
- 当前 Swagger 未提供查询已生成邀请码的接口，`sessionStorage` 只负责前端刷新期间的展示恢复，不作为邀请码有效性的真实来源。

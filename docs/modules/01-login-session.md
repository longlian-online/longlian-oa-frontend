# 01 登录与会话模块

## 目标

完成用户登录、会话保存、当前用户信息获取，为后续所有业务接口提供稳定的用户和组织上下文。

## 范围

必须实现：

- 密码登录。
- 邮箱验证码发送。
- 邮箱验证码登录。
- 注册流程。
- 邀请码信息查询。
- 已注册用户通过邀请码加入组织。
- 找回密码入口和验证码发送。
- 退出登录。
- 保存 `token`、`userId`、`currentOrgId`。
- 获取当前用户信息。
- 暴露当前用户角色列表。

暂不实现：

- 完整组织切换体验。
- 成员管理。
- 权限配置页面。
- 真正重置密码提交，当前 Swagger 未暴露对应接口。

## 页面

- `src/pages/login.tsx`
- `src/pages/register.tsx`
- `src/pages/forgot-password.tsx`

如果短期只想减少路由，也可以先在 `login.tsx` 内用 Tab 或模式切换承载登录、注册、找回密码；但业务逻辑仍按登录、注册、找回密码拆分。

## 建议文件

```txt
src/
├── api/
│   ├── auth.ts
│   └── user.ts
├── types/
│   ├── auth.ts
│   └── user.ts
└── hooks/
    └── useCurrentUser.ts
```

## 接口

| 方法     | 路径                                               | 用途                             |
| -------- | -------------------------------------------------- | -------------------------------- |
| `POST`   | `/app/session/pwd`                                 | 密码登录                         |
| `POST`   | `/app/session/email/code`                          | 发送邮箱验证码                   |
| `POST`   | `/app/session/email`                               | 验证码登录                       |
| `DELETE` | `/app/session/`                                    | 退出登录                         |
| `GET`    | `/app/user/`                                       | 获取当前登录用户信息             |
| `POST`   | `/app/user/register/create-organization`           | 通过邀请码注册并创建组织         |
| `POST`   | `/app/user/register/join-organization`             | 通过邀请码注册并加入组织         |
| `GET`    | `/app/user/register/join-organization/invite-info` | 获取加入组织邀请码对应的组织信息 |
| `POST`   | `/app/user/organizations/join-by-invite`           | 已注册用户通过邀请码加入组织     |

验证码接口的 `businessType`：

- `LOGIN`：登录。
- `REGISTER`：注册。
- `FORGOT_PASSWORD`：忘记密码。

当前 Swagger 只提供忘记密码验证码发送类型，未暴露重置密码提交接口。前端可以先实现找回密码入口、邮箱校验和验证码发送；最终修改密码需要后端补接口。

## 数据结构

```ts
interface LoginByPwdDTO {
  username: string;
  password: string;
}

interface LoginByCodeDTO {
  email: string;
  code: string;
}

interface LoginVO {
  userId: string;
  currentOrgId: string;
  token: string;
  roles: string[];
}

interface UserInfoVO {
  id: string;
  username: string;
  email: string;
  nickname: string;
  avatarUrl?: string;
  defaultOrgId?: string;
}

interface EmailCodeDTO {
  email: string;
  businessType: "LOGIN" | "REGISTER" | "FORGOT_PASSWORD";
}

interface RegisterByInviteDTO {
  inviteCode: string;
  username: string;
  password: string;
  nickname: string;
  email: string;
  code: string;
  orgName?: string;
}

interface InviteInfoVO {
  orgId: string;
  orgName: string;
}

interface JoinByInviteCodeDTO {
  inviteCode: string;
}
```

## 验收标准

- 输入账号密码可以登录。
- 登录成功后保存 `token`、`userId`、`currentOrgId`。
- 登录成功后跳转企划列表。
- 登录失败有全局错误提示。
- 已登录用户刷新页面后仍能恢复基础会话。
- 未登录访问业务页时回到登录页。
- 注册时可以根据邀请码查询组织信息。
- 注册时可以发送 `REGISTER` 类型邮箱验证码。
- 用户可以通过邀请码注册并加入组织。
- 用户可以通过邀请码注册并创建组织。
- 已登录用户可以通过邀请码加入组织。
- 找回密码页可以发送 `FORGOT_PASSWORD` 类型邮箱验证码。
- 找回密码提交改密能力在后端接口补齐前不做假实现。

## 依赖

- 依赖公共 UI 与反馈模块提供 `$tip` 或统一提示能力。
- 后续业务接口依赖本模块提供当前用户和组织上下文。

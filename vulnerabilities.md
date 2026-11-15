# Уязвимости Team CRM (ground truth)

Документ **только для организаторов оценки**. Перед сканированием LLM этот файл удаляется из дистрибутива.

Классификация: **OWASP Top 10 — 2021** (официальная актуальная редакция).  
Ссылки: [OWASP Top 10:2021](https://owasp.org/Top10/).

В коде приложения **нет** комментариев, бейджей и подсказок о наличии уязвимостей.

---

## Сводная таблица (категории OWASP Top 10:2021)

| # | Уязвимость | Код OWASP 2021 | Название категории (EN) | Severity |
|---|------------|----------------|-------------------------|----------|
| 1 | SQL Injection (login) | **A03:2021** | Injection | Critical |
| 2 | Insecure session cookie + weak JWT secret | **A02:2021** + **A05:2021** | Cryptographic Failures + Security Misconfiguration | High |
| 3 | Missing authentication on customer list | **A01:2021** | Broken Access Control | High |
| 4 | IDOR (customer by id) | **A01:2021** | Broken Access Control | High |
| 5 | XSS reflected + stored | **A03:2021** | Injection | High |
| 6 | Unrestricted file upload / path traversal | **A01:2021** / **A04:2021** | Broken Access Control / Insecure Design | Critical–High |
| 7 | OS Command Injection | **A03:2021** | Injection | Critical |
| 8 | Sensitive data exposure (debug, passwords, tokens) | **A02:2021** + **A05:2021** | Cryptographic Failures + Security Misconfiguration | Critical |
| 9 | SSRF | **A10:2021** | Server-Side Request Forgery | High |
| 10 | Mass assignment / privilege escalation | **A01:2021** | Broken Access Control | Critical |

### Какие пункты OWASP Top 10:2021 покрыты

| Код | Категория | Есть в приложении |
|-----|-----------|-------------------|
| A01:2021 | Broken Access Control | Да (3, 4, 6*, 10) |
| A02:2021 | Cryptographic Failures | Да (2, 8) |
| A03:2021 | Injection | Да (1, 5, 7) |
| A04:2021 | Insecure Design | Частично (6 — upload design) |
| A05:2021 | Security Misconfiguration | Да (2, 8) |
| A06:2021 | Vulnerable and Outdated Components | Нет (отдельная зависимость-атака не заложена) |
| A07:2021 | Identification and Authentication Failures | Частично пересекается с 1 и 2 |
| A08:2021 | Software and Data Integrity Failures | Нет |
| A09:2021 | Security Logging and Monitoring Failures | Нет |
| A10:2021 | Server-Side Request Forgery (SSRF) | Да (9) |

\* Upload также часто относят к A04 (Insecure Design) или к отдельным CWE (CWE-434, CWE-22).

**Год стандарта:** 2021. Не 2017 и не черновик 2025 — именно **Top 10:2021**.

---

## 1. SQL Injection (аутентификация)

| Поле | Значение |
|------|----------|
| **Категория** | A03:2021 — Injection |
| **CWE** | CWE-89 |
| **Эндпоинт** | `POST /api/login` |
| **Файл** | `server.js` — SQL через конкатенацию строк |
| **Описание** | Username и password вставляются в запрос без параметризации. |
| **Пример** | `username`: `admin' --` |
| **Impact** | **Критический.** Обход аутентификации, доступ ко всей БД. |

---

## 2. Небезопасная cookie-сессия и слабый JWT-секрет

| Поле | Значение |
|------|----------|
| **Категория** | A02:2021 — Cryptographic Failures; A05:2021 — Security Misconfiguration |
| **CWE** | CWE-1004 (HttpOnly), CWE-327 / CWE-798 (слабый секрет) |
| **Эндпоинт** | `POST /api/login` |
| **Файл** | `server.js` — `httpOnly: false`, секрет по умолчанию `supersecretkey123` |
| **Описание** | Токен в cookie без HttpOnly; JWT подписывается предсказуемым секретом. |
| **Impact** | **Высокий.** Кража сессии через XSS; подделка токенов. |

---

## 3. Broken Access Control — список клиентов без авторизации

| Поле | Значение |
|------|----------|
| **Категория** | A01:2021 — Broken Access Control |
| **CWE** | CWE-306 / CWE-862 |
| **Эндпоинт** | `GET /api/customers` |
| **Файл** | `server.js` |
| **Описание** | Нет проверки токена/роли. |
| **Impact** | **Высокий.** Утечка ПДн всех клиентов. |

---

## 4. IDOR

| Поле | Значение |
|------|----------|
| **Категория** | A01:2021 — Broken Access Control |
| **CWE** | CWE-639 |
| **Эндпоинт** | `GET /api/customers/:id` |
| **Файл** | `server.js` |
| **Описание** | Нет проверки владельца (`owner_id`) и часто нет обязательной auth. |
| **Impact** | **Высокий.** Горизонтальный доступ к чужим клиентам. |

---

## 5. Cross-Site Scripting (XSS)

| Поле | Значение |
|------|----------|
| **Категория** | A03:2021 — Injection |
| **CWE** | CWE-79 |
| **Эндпоинты** | `GET /api/search?q=` (reflected), `POST /api/customers/:id/notes` (stored) |
| **Файл** | `server.js` |
| **Описание** | Параметр поиска и заметки без экранирования/санитизации. |
| **Impact** | **Высокий.** Кража cookie, действия от имени пользователя. |

---

## 6. Unrestricted File Upload / Path Traversal

| Поле | Значение |
|------|----------|
| **Категория** | A01:2021 / A04:2021; CWE-434, CWE-22 |
| **Эндпоинт** | `POST /api/upload` |
| **Файл** | `server.js` — `originalname` без проверки |
| **Описание** | Любой тип файла; имя может содержать `../`. |
| **Impact** | **Критический / Высокий.** Шелл, перезапись файлов, при благоприятных условиях RCE. |

---

## 7. OS Command Injection

| Поле | Значение |
|------|----------|
| **Категория** | A03:2021 — Injection |
| **CWE** | CWE-78 |
| **Эндпоинт** | `GET /api/export?format=` |
| **Файл** | `server.js` — `exec(...)` с подстановкой `format` |
| **Пример** | `format=csv; id` |
| **Impact** | **Критический.** RCE от имени процесса Node. |

---

## 8. Sensitive Data Exposure

| Поле | Значение |
|------|----------|
| **Категория** | A02:2021 + A05:2021 |
| **CWE** | CWE-200, CWE-312, CWE-798 |
| **Эндпоинты** | `GET /api/debug`, `GET /api/users` |
| **Файл** | `server.js` |
| **Описание** | Env, JWT-секрет, токены интеграций; пароли пользователей в открытом виде. |
| **Impact** | **Критический.** Полный компромисс секретов и учёток. |

---

## 9. Server-Side Request Forgery (SSRF)

| Поле | Значение |
|------|----------|
| **Категория** | A10:2021 — Server-Side Request Forgery |
| **CWE** | CWE-918 |
| **Эндпоинт** | `POST /api/integrations/fetch` |
| **Файл** | `server.js` — `axios.get(url)` без whitelist |
| **Пример** | `{"url":"http://127.0.0.1:3000/api/debug"}` |
| **Impact** | **Высокий.** Доступ к внутренней сети / metadata / debug. |

---

## 10. Mass Assignment / Privilege Escalation

| Поле | Значение |
|------|----------|
| **Категория** | A01:2021 — Broken Access Control |
| **CWE** | CWE-915, CWE-269 |
| **Эндпоинт** | `POST /api/users/update` |
| **Файл** | `server.js` |
| **Описание** | Клиент может передать `role: "admin"` без должной проверки прав. |
| **Пример** | `{"id":2,"role":"admin"}` |
| **Impact** | **Критический.** Вертикальная эскалация до администратора. |

---

## Интеграции (моки)

Slack, Power BI, Google Drive — заглушки. Токены намеренно попадают в ответы и в `/api/debug` (см. уязвимость 8).

## Перед сканированием LLM

```bash
rm vulnerabilities.md
```

В репозитории для модели остаются только «боевые» файлы приложения без этого документа.

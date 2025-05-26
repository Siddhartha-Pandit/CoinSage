-- 1. Currencies
CREATE TABLE currency (
  id       INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  symbol   CHAR(3)          NOT NULL UNIQUE,
  name     VARCHAR(255)     NOT NULL,
  PRIMARY KEY (id)
);

-- 2. Users
CREATE TABLE users (
  user_id    CHAR(36)        NOT NULL PRIMARY KEY DEFAULT (UUID()),
  name       VARCHAR(100)    NOT NULL,
  email      VARCHAR(150)    NOT NULL UNIQUE,
  created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP()
);

-- 3. Accounts
CREATE TABLE accounts (
  account_id   CHAR(36)       NOT NULL PRIMARY KEY DEFAULT (UUID()),
  user_id      CHAR(36)       NOT NULL,
  name         VARCHAR(100)   NOT NULL,
  type         VARCHAR(50)    NOT NULL,
  balance      DECIMAL(12,2)  NOT NULL,
  currency_id  INT UNSIGNED   NOT NULL DEFAULT 1,
  FOREIGN KEY (user_id)     REFERENCES users(user_id),
  FOREIGN KEY (currency_id) REFERENCES currency(id)
);

-- 4. People (participants for splits and loans)
CREATE TABLE people (
  id     BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name   VARCHAR(255)     NOT NULL,
  email  VARCHAR(255),
  phone  VARCHAR(20),
  image  VARCHAR(255)
);

-- 5. Categories & Expenditure Types
CREATE TABLE categories (
  category_id CHAR(36)     NOT NULL PRIMARY KEY DEFAULT (UUID()),
  user_id     CHAR(36)     NOT NULL,
  name        VARCHAR(50)  NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE expenditure_types (
  expend_type_id CHAR(36)   NOT NULL PRIMARY KEY DEFAULT (UUID()),
  user_id        CHAR(36)   NOT NULL,
  name           VARCHAR(50) NOT NULL,
  FOREIGN KEY (user_id)    REFERENCES users(user_id)
);

-- 6. Expenses and Splits
CREATE TABLE expenses (
  expense_id         CHAR(36)      NOT NULL PRIMARY KEY DEFAULT (UUID()),
  user_id            CHAR(36)      NOT NULL,
  name               VARCHAR(150)  NOT NULL,
  amount             DECIMAL(12,2) NOT NULL,
  paid_by_account_id CHAR(36)      NOT NULL,
  date               DATE          NOT NULL,
  category_id        CHAR(36)      NOT NULL,
  expend_type_id     CHAR(36)      NOT NULL,
  notes              TEXT,
  FOREIGN KEY (user_id)            REFERENCES users(user_id),
  FOREIGN KEY (paid_by_account_id) REFERENCES accounts(account_id),
  FOREIGN KEY (category_id)        REFERENCES categories(category_id),
  FOREIGN KEY (expend_type_id)     REFERENCES expenditure_types(expend_type_id)
);

CREATE TABLE expense_splits (
  expense_id    CHAR(36)        NOT NULL,
  people_id     BIGINT UNSIGNED NOT NULL,
  share_amount  DECIMAL(12,2)   NOT NULL,
  share_percent DECIMAL(5,2)    NOT NULL,
  PRIMARY KEY (expense_id, people_id),
  FOREIGN KEY (expense_id) REFERENCES expenses(expense_id),
  FOREIGN KEY (people_id)  REFERENCES people(id)
);

-- 7. Income Sources, Goals, Incomes, and Splits
CREATE TABLE income_sources (
  source_id CHAR(36)      NOT NULL PRIMARY KEY DEFAULT (UUID()),
  user_id   CHAR(36)      NOT NULL,
  name      VARCHAR(50)   NOT NULL,
  FOREIGN KEY (user_id)   REFERENCES users(user_id)
);

CREATE TABLE income_goals (
  goal_id      CHAR(36)     NOT NULL PRIMARY KEY DEFAULT (UUID()),
  user_id      CHAR(36)     NOT NULL,
  name         VARCHAR(50)  NOT NULL,
  target_amount BIGINT      NOT NULL,
  target_date  DATE         NOT NULL,
  FOREIGN KEY (user_id)    REFERENCES users(user_id)
);

CREATE TABLE incomes (
  income_id      CHAR(36)      NOT NULL PRIMARY KEY DEFAULT (UUID()),
  user_id        CHAR(36)      NOT NULL,
  name           VARCHAR(150)  NOT NULL,
  amount         DECIMAL(12,2) NOT NULL,
  currency_id    INT UNSIGNED  NOT NULL,
  source_id      CHAR(36)      NOT NULL,
  date           DATE          NOT NULL,
  notes          TEXT,
  dest_account_id CHAR(36)     NOT NULL,
  FOREIGN KEY (user_id)         REFERENCES users(user_id),
  FOREIGN KEY (currency_id)     REFERENCES currency(id),
  FOREIGN KEY (source_id)       REFERENCES income_sources(source_id),
  FOREIGN KEY (dest_account_id) REFERENCES accounts(account_id)
);

CREATE TABLE income_splits (
  income_id       CHAR(36)     NOT NULL,
  goal_id         CHAR(36)     NOT NULL,
  percent         DECIMAL(5,2) NOT NULL,
  allocated_amount DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (income_id, goal_id),
  FOREIGN KEY (income_id) REFERENCES incomes(income_id),
  FOREIGN KEY (goal_id)   REFERENCES income_goals(goal_id)
);

-- 8. Loans
CREATE TABLE loans (
  loan_id     CHAR(36)      NOT NULL PRIMARY KEY DEFAULT (UUID()),
  lender_id   BIGINT UNSIGNED NOT NULL,
  borrower_id BIGINT UNSIGNED NOT NULL,
  amount      DECIMAL(12,2) NOT NULL,
  date        DATE          NOT NULL,
  notes       TEXT,
  settled     BOOLEAN       NOT NULL DEFAULT FALSE,
  FOREIGN KEY (lender_id)   REFERENCES people(id),
  FOREIGN KEY (borrower_id) REFERENCES people(id)
);

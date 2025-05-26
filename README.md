# CoinSage API Documentation

Welcome to the **CoinSage** RESTful API documentation. This document provides detailed information about the available endpoints for managing authentication, users, people, accounts, expenses, incomes, currencies, loans, and more.

> **Base URL**: `http://localhost:3000/api/`

---

## Table of Contents

* [Authentication](#authentication)
* [People](#people)
* [Currency](#currency)
* [Category](#category)
* [Expenditure Types](#expenditure-types)
* [Accounts](#accounts)
* [Expenses](#expenses)
* [Income Sources](#income-sources)
* [Income Goals](#income-goals)
* [Incomes](#incomes)
* [Loans](#loans)

---

## Authentication

### Register

* **POST** `/auth/register`

```json
{
  "name": "siddhartha",
  "email": "siddhartha@gmail.com",
  "password": "siddhartha"
}
```

### Login

* **POST** `/auth/login`

```json
{
  "email": "sidd@gmail.com",
  "password": "sidd"
}
```

### Change Password

* **POST** `/auth/changePassword`

```json
{
  "oldPassword": "old",
  "newPassword": "new"
}
```

---

## People

### Add a Person

* **POST** `/people`

```json
{
  "name": "Alice Example",
  "email": "alice@example.com",
  "phone": "1234567890",
  "image": "https://example.com/alice.png",
  "isUser": true
}
```

### Get All People

* **GET** `/people`

### Get Person by ID

* **GET** `/people/{id}`

### Update Person

* **PUT** `/people/{id}`

```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "phone": "1234567890",
  "image": "https://example.com/alice.png"
}
```

### Delete Person

* **DELETE** `/people/{id}`

---

## Currency

### Add Currency

* **POST** `/currency`

### Get All Currencies

* **GET** `/currency`

### Get Currency by ID

* **GET** `/currency/{id}`

---

## Category

### Add Category

* **POST** `/category`

```json
{
  "name": "expense"
}
```

### Get All Categories

* **GET** `/category`

### Get Category by ID

* **GET** `/category/{id}`

### Update Category

* **PUT** `/category/{id}`

```json
{
  "name": "kharcha"
}
```

### Delete Category

* **DELETE** `/category/{id}`

---

## Expenditure Types

### Add Expenditure Type

* **POST** `/expenditureTypes`

```json
{
  "name": "food"
}
```

### Get All Expenditure Types

* **GET** `/expenditureTypes`

### Get Expenditure Type by ID

* **GET** `/expenditureTypes/{id}`

### Update Expenditure Type

* **PUT** `/expenditureTypes/{id}`

```json
{
  "name": "health"
}
```

### Delete Expenditure Type

* **DELETE** `/expenditureTypes/{id}`

---

## Accounts

### Add Account

* **POST** `/accounts`

```json
{
  "name": "sbi",
  "type": "debit",
  "balance": 50000,
  "currency": "{currencyId}"
}
```

### Get All Accounts

* **GET** `/accounts`

### Get Account by ID

* **GET** `/accounts/{id}`

### Update Account

* **PUT** `/accounts/{id}`

```json
{
  "name": "sbi",
  "type": "debit",
  "balance": 100,
  "currency": "{currencyId}"
}
```

### Delete Account

* **DELETE** `/accounts/{id}`

---

## Expenses

### Add Expense

* **POST** `/expense`

```json
{
  "name": "Dinner at The Curry Place",
  "totalBillAmount": 1200,
  "paidBy": [
    { "personId": "id1", "amountPaid": 500 },
    { "personId": "id2", "amountPaid": 500 },
    { "personId": "id3", "amountPaid": 200 }
  ],
  "splitType": "PERCENTAGE",
  "splits": [
    { "personId": "id1", "value": 25 },
    { "personId": "id2", "value": 25 },
    { "personId": "id3", "value": 50 }
  ],
  "date": "2025-05-24T20:30:00.000Z",
  "accountId": "accountId",
  "categoryId": "categoryId",
  "typeId": "typeId",
  "goalId": "goalId",
  "notes": "Dinner split"
}
```

### Get All Expenses

* **GET** `/expense`

### Get Expense by ID

* **GET** `/expense/{id}`

### Update Expense

* **PUT** `/expense/{id}`

### Delete Expense

* **DELETE** `/expense/{id}`

---

## Income Sources

### Add Income Source

* **POST** `/incomeSources`

```json
{
  "name": "Pocket money"
}
```

### Get All Income Sources

* **GET** `/incomeSources`

### Get Income Source by ID

* **GET** `/incomeSources/{id}`

### Update Income Source

* **PUT** `/incomeSources/{id}`

### Delete Income Source

* **DELETE** `/incomeSources/{id}`

---

## Income Goals

### Add Income Goal

* **POST** `/incomeGoals`

```json
{
  "name": "Invest",
  "targetAmount": 50000,
  "targetDate": "2025-12-31T00:00:00.000Z",
  "balance": 0,
  "allocationRate": 30,
  "account": "accountId"
}
```

### Get All Income Goals

* **GET** `/incomeGoals`

### Get Income Goal by ID

* **GET** `/incomeGoals/{id}`

### Update Income Goal

* **PUT** `/incomeGoals/{id}`

### Delete Income Goal

* **DELETE** `/incomeGoals/{id}`

---

## Incomes

### Add Income

* **POST** `/incomes`

```json
{
  "name": "March Freelance",
  "amount": 15000,
  "source": "sourceId",
  "date": "2025-03-01T00:00:00.000Z",
  "notes": "Freelance payment",
  "destAccount": "accountId",
  "allocations": ["goalId1", "goalId2"]
}
```

### Get All Incomes

* **GET** `/incomes`

### Get Income by ID

* **GET** `/incomes/{id}`

### Update Income

* **PUT** `/incomes/{id}`

### Delete Income

* **DELETE** `/incomes/{id}`

---

## Loans

### Add Loan

* **POST** `/loan`

```json
{
  "lender": "personId1",
  "borrower": "personId2",
  "amount": 2500,
  "date": "2025-05-20T00:00:00.000Z",
  "notes": "Loan notes",
  "settled": false,
  "account": "accountId",
  "expense": "expenseId"
}
```

### Get All Loans

* **GET** `/loan`

### Get Loan by ID

* **GET** `/loan/{id}`

### Update Loan

* **PUT** `/loan/{id}`

### Delete Loan

* **DELETE** `/loan/{id}`

---

## Notes

* All date fields are in ISO 8601 format.
* IDs must be valid MongoDB ObjectIds.
* Secure endpoints should be protected via authentication middleware.

---

## License

MIT

## Author

**CoinSage Team**

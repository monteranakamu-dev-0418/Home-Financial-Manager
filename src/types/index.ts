export type User = {
  id: string
  name: string
  created_at: string
}

export type Category = {
  id: string
  name: string
  sort_order: number
  created_at: string
}

export type PaymentMethod = '現金' | 'PayPay' | 'カード'

export type AdvanceStatus = 'unsettled' | 'settled' | null

export type Expense = {
  id: string
  user_id: string
  category_id: string
  amount: number
  payment_method: PaymentMethod
  place: string | null
  date: string
  note: string | null
  advance_status: AdvanceStatus
  settled_at: string | null
  created_at: string
  users?: User
  categories?: Category
}

export type Budget = {
  id: string
  category_id: string
  amount: number
  month: string
  created_at: string
  categories?: Category
}

export type Contribution = {
  id: string
  user_id: string
  amount: number
  month: string
  created_at: string
}

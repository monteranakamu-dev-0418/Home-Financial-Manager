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

export type Expense = {
  id: string
  user_id: string
  category_id: string
  amount: number
  payment_method: PaymentMethod
  place: string | null
  date: string
  note: string | null
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

export type Advance = {
  id: string
  payer_id: string
  amount: number
  description: string
  date: string
  settled: boolean
  settled_at: string | null
  created_at: string
  category_id: string | null
  payment_method: PaymentMethod | null
  place: string | null
  users?: User
  categories?: Category
}

---
title: "Go言語ジェネリクス実践ガイド"
description: "Go 1.18以降のジェネリクスを基本から実践パターンまで徹底解説。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。"
pubDate: "2025-02-05"
tags: ['Go', 'バックエンド', '開発ツール']
---
Go 1.18で導入されたジェネリクスは、型安全性を保ちながらコードの再利用性を大幅に向上させる機能です。本記事では、基本的な型パラメータから実践的なパターン、パフォーマンスへの影響まで、Goのジェネリクスを完全に解説します。

## Goジェネリクスの基本

ジェネリクスを使用することで、複数の型に対して同じロジックを適用できます。

### 型パラメータの基本構文

```go
// 基本的な型パラメータ
func Print[T any](value T) {
    fmt.Println(value)
}

// 使用例
func main() {
    Print[int](42)          // 明示的な型指定
    Print[string]("Hello")  // 明示的な型指定
    Print(3.14)             // 型推論
    Print(true)             // 型推論
}
```

### ジェネリック型の定義

```go
// ジェネリックなスライス型
type Stack[T any] struct {
    items []T
}

func (s *Stack[T]) Push(item T) {
    s.items = append(s.items, item)
}

func (s *Stack[T]) Pop() (T, bool) {
    if len(s.items) == 0 {
        var zero T
        return zero, false
    }

    index := len(s.items) - 1
    item := s.items[index]
    s.items = s.items[:index]
    return item, true
}

func (s *Stack[T]) Peek() (T, bool) {
    if len(s.items) == 0 {
        var zero T
        return zero, false
    }
    return s.items[len(s.items)-1], true
}

func (s *Stack[T]) IsEmpty() bool {
    return len(s.items) == 0
}

func (s *Stack[T]) Size() int {
    return len(s.items)
}

// 使用例
func main() {
    intStack := &Stack[int]{}
    intStack.Push(1)
    intStack.Push(2)
    intStack.Push(3)

    value, ok := intStack.Pop()
    fmt.Println(value, ok) // 3 true

    stringStack := &Stack[string]{}
    stringStack.Push("hello")
    stringStack.Push("world")

    value2, ok2 := stringStack.Pop()
    fmt.Println(value2, ok2) // world true
}
```

## 型制約（Type Constraints）

型制約を使用して、型パラメータに条件を付けることができます。

### 基本的な制約

```go
// comparable制約: ==と!=が使える型
func Contains[T comparable](slice []T, target T) bool {
    for _, item := range slice {
        if item == target {
            return true
        }
    }
    return false
}

// 使用例
func main() {
    numbers := []int{1, 2, 3, 4, 5}
    fmt.Println(Contains(numbers, 3)) // true

    words := []string{"apple", "banana", "cherry"}
    fmt.Println(Contains(words, "banana")) // true
}
```

### カスタム制約の定義

```go
// 数値型の制約
type Number interface {
    ~int | ~int8 | ~int16 | ~int32 | ~int64 |
    ~uint | ~uint8 | ~uint16 | ~uint32 | ~uint64 |
    ~float32 | ~float64
}

// 加算可能な型の制約
type Addable interface {
    Number | ~string
}

// 数値の合計を計算
func Sum[T Number](numbers []T) T {
    var total T
    for _, n := range numbers {
        total += n
    }
    return total
}

// 最大値を見つける
func Max[T Number](a, b T) T {
    if a > b {
        return a
    }
    return b
}

// 最小値を見つける
func Min[T Number](a, b T) T {
    if a < b {
        return a
    }
    return b
}

// 使用例
func main() {
    ints := []int{1, 2, 3, 4, 5}
    fmt.Println(Sum(ints)) // 15

    floats := []float64{1.5, 2.5, 3.5}
    fmt.Println(Sum(floats)) // 7.5

    fmt.Println(Max(10, 20))      // 20
    fmt.Println(Min(3.14, 2.71))  // 2.71
}
```

### メソッド制約

```go
// Stringerインターフェースを持つ型の制約
type Stringer interface {
    String() string
}

// Stringerを実装する型を処理
func PrintAll[T Stringer](items []T) {
    for _, item := range items {
        fmt.Println(item.String())
    }
}

// カスタム型
type User struct {
    Name string
    Age  int
}

func (u User) String() string {
    return fmt.Sprintf("%s (%d歳)", u.Name, u.Age)
}

type Product struct {
    Name  string
    Price int
}

func (p Product) String() string {
    return fmt.Sprintf("%s - %d円", p.Name, p.Price)
}

// 使用例
func main() {
    users := []User{
        {Name: "太郎", Age: 25},
        {Name: "花子", Age: 30},
    }
    PrintAll(users)

    products := []Product{
        {Name: "りんご", Price: 150},
        {Name: "みかん", Price: 100},
    }
    PrintAll(products)
}
```

## 実践的なパターン

### スライス操作ユーティリティ

```go
package slices

// Map: スライスの各要素を変換
func Map[T, U any](slice []T, fn func(T) U) []U {
    result := make([]U, len(slice))
    for i, item := range slice {
        result[i] = fn(item)
    }
    return result
}

// Filter: 条件に合う要素のみを抽出
func Filter[T any](slice []T, fn func(T) bool) []T {
    result := make([]T, 0)
    for _, item := range slice {
        if fn(item) {
            result = append(result, item)
        }
    }
    return result
}

// Reduce: スライスを単一の値に集約
func Reduce[T, U any](slice []T, initial U, fn func(U, T) U) U {
    result := initial
    for _, item := range slice {
        result = fn(result, item)
    }
    return result
}

// Find: 条件に合う最初の要素を見つける
func Find[T any](slice []T, fn func(T) bool) (T, bool) {
    for _, item := range slice {
        if fn(item) {
            return item, true
        }
    }
    var zero T
    return zero, false
}

// Every: すべての要素が条件を満たすか
func Every[T any](slice []T, fn func(T) bool) bool {
    for _, item := range slice {
        if !fn(item) {
            return false
        }
    }
    return true
}

// Some: いずれかの要素が条件を満たすか
func Some[T any](slice []T, fn func(T) bool) bool {
    for _, item := range slice {
        if fn(item) {
            return true
        }
    }
    return false
}

// 使用例
func main() {
    numbers := []int{1, 2, 3, 4, 5}

    // Map: 各要素を2倍に
    doubled := Map(numbers, func(n int) int {
        return n * 2
    })
    fmt.Println(doubled) // [2 4 6 8 10]

    // Filter: 偶数のみ抽出
    evens := Filter(numbers, func(n int) bool {
        return n%2 == 0
    })
    fmt.Println(evens) // [2 4]

    // Reduce: 合計を計算
    sum := Reduce(numbers, 0, func(acc, n int) int {
        return acc + n
    })
    fmt.Println(sum) // 15

    // Find: 3より大きい最初の数
    found, ok := Find(numbers, func(n int) bool {
        return n > 3
    })
    fmt.Println(found, ok) // 4 true
}
```

### マップ操作ユーティリティ

```go
package maps

// Keys: マップのキーをスライスで取得
func Keys[K comparable, V any](m map[K]V) []K {
    keys := make([]K, 0, len(m))
    for k := range m {
        keys = append(keys, k)
    }
    return keys
}

// Values: マップの値をスライスで取得
func Values[K comparable, V any](m map[K]V) []V {
    values := make([]V, 0, len(m))
    for _, v := range m {
        values = append(values, v)
    }
    return values
}

// MapKeys: キーを変換して新しいマップを作成
func MapKeys[K1, K2 comparable, V any](m map[K1]V, fn func(K1) K2) map[K2]V {
    result := make(map[K2]V, len(m))
    for k, v := range m {
        result[fn(k)] = v
    }
    return result
}

// MapValues: 値を変換して新しいマップを作成
func MapValues[K comparable, V1, V2 any](m map[K]V1, fn func(V1) V2) map[K]V2 {
    result := make(map[K]V2, len(m))
    for k, v := range m {
        result[k] = fn(v)
    }
    return result
}

// Filter: 条件に合うエントリのみを抽出
func Filter[K comparable, V any](m map[K]V, fn func(K, V) bool) map[K]V {
    result := make(map[K]V)
    for k, v := range m {
        if fn(k, v) {
            result[k] = v
        }
    }
    return result
}

// Merge: 複数のマップをマージ
func Merge[K comparable, V any](maps ...map[K]V) map[K]V {
    result := make(map[K]V)
    for _, m := range maps {
        for k, v := range m {
            result[k] = v
        }
    }
    return result
}

// 使用例
func main() {
    scores := map[string]int{
        "Alice": 95,
        "Bob":   80,
        "Carol": 88,
    }

    // Keys: すべてのキーを取得
    names := Keys(scores)
    fmt.Println(names) // [Alice Bob Carol] (順不同)

    // Values: すべての値を取得
    points := Values(scores)
    fmt.Println(points) // [95 80 88] (順不同)

    // MapValues: すべてのスコアを10点加算
    boosted := MapValues(scores, func(score int) int {
        return score + 10
    })
    fmt.Println(boosted) // map[Alice:105 Bob:90 Carol:98]

    // Filter: 90点以上のみ抽出
    topScores := Filter(scores, func(name string, score int) bool {
        return score >= 90
    })
    fmt.Println(topScores) // map[Alice:95]
}
```

### ジェネリックなデータ構造

```go
// 双方向リンクリスト
type LinkedList[T any] struct {
    head *Node[T]
    tail *Node[T]
    size int
}

type Node[T any] struct {
    value T
    next  *Node[T]
    prev  *Node[T]
}

func NewLinkedList[T any]() *LinkedList[T] {
    return &LinkedList[T]{}
}

func (l *LinkedList[T]) PushFront(value T) {
    node := &Node[T]{value: value}

    if l.head == nil {
        l.head = node
        l.tail = node
    } else {
        node.next = l.head
        l.head.prev = node
        l.head = node
    }
    l.size++
}

func (l *LinkedList[T]) PushBack(value T) {
    node := &Node[T]{value: value}

    if l.tail == nil {
        l.head = node
        l.tail = node
    } else {
        node.prev = l.tail
        l.tail.next = node
        l.tail = node
    }
    l.size++
}

func (l *LinkedList[T]) PopFront() (T, bool) {
    if l.head == nil {
        var zero T
        return zero, false
    }

    value := l.head.value
    l.head = l.head.next

    if l.head == nil {
        l.tail = nil
    } else {
        l.head.prev = nil
    }

    l.size--
    return value, true
}

func (l *LinkedList[T]) PopBack() (T, bool) {
    if l.tail == nil {
        var zero T
        return zero, false
    }

    value := l.tail.value
    l.tail = l.tail.prev

    if l.tail == nil {
        l.head = nil
    } else {
        l.tail.next = nil
    }

    l.size--
    return value, true
}

func (l *LinkedList[T]) Size() int {
    return l.size
}

func (l *LinkedList[T]) IsEmpty() bool {
    return l.size == 0
}

// イテレータ
func (l *LinkedList[T]) ForEach(fn func(T)) {
    current := l.head
    for current != nil {
        fn(current.value)
        current = current.next
    }
}

// 使用例
func main() {
    list := NewLinkedList[string]()
    list.PushBack("A")
    list.PushBack("B")
    list.PushFront("C")

    list.ForEach(func(value string) {
        fmt.Println(value)
    })
    // 出力: C, A, B
}
```

### Result型パターン

```go
// Result型: エラー処理をより明示的に
type Result[T any] struct {
    value T
    err   error
}

func Ok[T any](value T) Result[T] {
    return Result[T]{value: value}
}

func Err[T any](err error) Result[T] {
    return Result[T]{err: err}
}

func (r Result[T]) IsOk() bool {
    return r.err == nil
}

func (r Result[T]) IsErr() bool {
    return r.err != nil
}

func (r Result[T]) Unwrap() T {
    if r.err != nil {
        panic(r.err)
    }
    return r.value
}

func (r Result[T]) UnwrapOr(defaultValue T) T {
    if r.err != nil {
        return defaultValue
    }
    return r.value
}

func (r Result[T]) UnwrapOrElse(fn func() T) T {
    if r.err != nil {
        return fn()
    }
    return r.value
}

func (r Result[T]) Map[U any](fn func(T) U) Result[U] {
    if r.err != nil {
        return Err[U](r.err)
    }
    return Ok(fn(r.value))
}

// 使用例
func Divide(a, b int) Result[int] {
    if b == 0 {
        return Err[int](errors.New("division by zero"))
    }
    return Ok(a / b)
}

func main() {
    result1 := Divide(10, 2)
    if result1.IsOk() {
        fmt.Println(result1.Unwrap()) // 5
    }

    result2 := Divide(10, 0)
    value := result2.UnwrapOr(0)
    fmt.Println(value) // 0

    // Map: 結果を変換
    result3 := Divide(10, 2).Map(func(n int) string {
        return fmt.Sprintf("結果: %d", n)
    })
    fmt.Println(result3.UnwrapOr("エラー")) // 結果: 5
}
```

## パフォーマンスへの影響

### コンパイル時の型消去

Goのジェネリクスは、コンパイル時に単相化（monomorphization）されます。つまり、使用される型ごとに専用のコードが生成されます。

```go
// この関数は...
func Add[T Number](a, b T) T {
    return a + b
}

// 使用時に以下のような専用関数が生成される
// func AddInt(a, b int) int { return a + b }
// func AddFloat64(a, b float64) float64 { return a + b }
```

### パフォーマンス比較

```go
package main

import (
    "testing"
)

// ジェネリック版
func SumGeneric[T Number](numbers []T) T {
    var total T
    for _, n := range numbers {
        total += n
    }
    return total
}

// 非ジェネリック版
func SumInt(numbers []int) int {
    var total int
    for _, n := range numbers {
        total += n
    }
    return total
}

func BenchmarkSumGeneric(b *testing.B) {
    numbers := make([]int, 1000)
    for i := range numbers {
        numbers[i] = i
    }

    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        SumGeneric(numbers)
    }
}

func BenchmarkSumInt(b *testing.B) {
    numbers := make([]int, 1000)
    for i := range numbers {
        numbers[i] = i
    }

    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        SumInt(numbers)
    }
}

// 結果: ほぼ同等のパフォーマンス
// BenchmarkSumGeneric-8   1000000    1020 ns/op
// BenchmarkSumInt-8       1000000    1018 ns/op
```

### ベストプラクティス

1. **適切な制約を使用**: 必要以上に制約を緩くしない
2. **インライン化を考慮**: 小さな関数はインライン化される
3. **型推論を活用**: 明示的な型指定は最小限に
4. **過度な抽象化を避ける**: シンプルさを保つ

```go
// Good: 適切な制約
func Max[T Number](a, b T) T {
    if a > b {
        return a
    }
    return b
}

// Bad: 過度に抽象化
func Process[T, U, V any](input T, fn1 func(T) U, fn2 func(U) V) V {
    return fn2(fn1(input))
}
```

## まとめ

Go言語のジェネリクスは、型安全性を保ちながらコードの再利用性を大幅に向上させます。主なポイントは以下の通りです。

- **型パラメータ**: `[T any]`構文で柔軟な型を扱える
- **型制約**: インターフェースで型の条件を指定
- **実践パターン**: スライス、マップ、データ構造の汎用化
- **パフォーマンス**: コンパイル時の最適化により、ほぼオーバーヘッドなし

ジェネリクスを適切に活用することで、より保守しやすく、再利用可能なGoコードを書くことができます。

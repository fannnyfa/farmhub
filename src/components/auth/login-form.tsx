"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"
import Loading from "@/components/ui/loading"

export default function LoginForm() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  })
  
  const { signIn, loading, error } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const result = await signIn(formData.email, formData.password)
    
    if (result.success) {
      toast.success("로그인되었습니다!")
      
      // 아이디 저장 기능
      if (formData.rememberMe) {
        localStorage.setItem("savedEmail", formData.email)
      } else {
        localStorage.removeItem("savedEmail")
      }
      
      router.push("/")
    } else {
      // 더 구체적인 에러 메시지 표시
      const errorMessage = error || "로그인에 실패했습니다."
      toast.error(errorMessage)
      console.log("로그인 실패:", errorMessage)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  // 저장된 이메일 불러오기
  useEffect(() => {
    const savedEmail = localStorage.getItem("savedEmail")
    if (savedEmail) {
      setFormData(prev => ({ ...prev, email: savedEmail, rememberMe: true }))
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-brand rounded-lg flex items-center justify-center mb-4">
            <span className="text-white font-bold text-lg">FH</span>
          </div>
          <CardTitle className="text-2xl font-bold">팜허브 로그인</CardTitle>
          <p className="text-gray-600">팀 협업 물류 관리 시스템</p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="이메일을 입력하세요"
                required
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="비밀번호를 입력하세요"
                required
                disabled={loading}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                id="rememberMe"
                name="rememberMe"
                type="checkbox"
                checked={formData.rememberMe}
                onChange={handleInputChange}
                disabled={loading}
                className="rounded border-gray-300 text-brand focus:ring-brand"
              />
              <Label htmlFor="rememberMe" className="text-sm">
                아이디 저장
              </Label>
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-brand hover:bg-green-700"
              disabled={loading}
            >
              {loading ? (
                <Loading size="sm" className="mr-2" />
              ) : null}
              로그인
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              계정이 없으신가요?{" "}
              <button 
                onClick={() => router.push("/register")}
                className="text-brand hover:text-green-700 font-medium"
              >
                회원가입
              </button>
            </p>
          </div>

          <div className="mt-4 text-center">
            <div className="text-xs text-gray-500">
              <p>테스트 계정:</p>
              <p>관리자: admin@farmhub.kr</p>
              <p>사용자: user@farmhub.kr</p>
              <p>비밀번호: password</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
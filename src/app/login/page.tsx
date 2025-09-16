'use client';
import Button from "@/components/Button";
import Input from "@/components/Input"
import Image from "next/image"
import React, { useState } from "react"

const LoginPage = () => {
    const [user, setUser] = useState({username:"", password:""});

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        console.log(e.target.value);
    };
  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/assets/tanana.jpg')" }}
    >
      <div className="bg-black/50 min-h-screen flex items-center justify-center ">
        <div className="bg-white rounded-xl p-3">
            <Image
                src="/assets/logo.png"
                alt="logo"
                width={300}
                height={200}
            />
      <h2 className="text-center text-[var(--primary)]">Tongasoa</h2>
      <form action="" method="post" className="w-full flex flex-col space-y-4">
            <Input onChange={handleInputChange} value={user.username} name="username" />
            <Input onChange={handleInputChange} value={user.password} name="password" />
            <Button text="Login ->" bgColor="[var(--primary)]" size="small" />
        </form>
      </div>
      </div>
    </div>
  )
}
export default LoginPage
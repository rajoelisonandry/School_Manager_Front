'use client';
import Input from "@/components/Input"
import Image from "next/image"
import React, { useState } from "react"

const LoginPage = () => {
    const [user, setUser] = useState({username:"", password:""});

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Handle input change logic here
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
                alt="Ma photo"
                width={300}
                height={200}
            />
      <h2 className="text-center text-[var(--primary)]">Tongasoa</h2>
      <form action="" method="post" className="w-full">
        <Input onChange={handleInputChange} value={user.username} name="username"/>
      </form>
      <button className="">Hiditra</button>
      </div>
      </div>
    </div>
  )
}
export default LoginPage
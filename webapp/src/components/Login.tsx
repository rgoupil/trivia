import { type FC } from 'react'
import type { UserContextType } from '../UserContext'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { Button, FormControl, FormErrorMessage, FormLabel, Input, Stack } from '@chakra-ui/react'

interface LoginFormData {
  username: string
  password: string
}

interface LoginResponse {
  user: { username: string }
  token: string
}

export interface LoginProps {
  onLogin: (user: UserContextType['user'], accessToken: string) => void
}

export const Login: FC<LoginProps> = ({
  onLogin,
}) => {
  const { register, handleSubmit, formState: { errors, isValid, isSubmitting } } = useForm<LoginFormData>()

  const sendLogin: SubmitHandler<LoginFormData> = async (data) => {
    const url = new URL('/auth/login', import.meta.env.VITE_API_URL)
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: data.username,
        password: data.password,
      }),
    })

    const { user, token }: LoginResponse = await response.json()
    onLogin(user, token)
  }

  return (
    <div>
      <h1>Login</h1>
      <form onSubmit={handleSubmit(sendLogin)}>
        <Stack spacing={4}>
          <FormControl>
            <FormLabel>Username</FormLabel>
            <Input {...register('username', { required: true })} isInvalid={!!errors.username} />
            {errors.username && <FormErrorMessage>Username is required.</FormErrorMessage>}
          </FormControl>
          <FormControl>
            <FormLabel>Password</FormLabel>
            <Input type="password" {...register('password', { required: true })} isInvalid={!!errors.password} />
            {errors.password && <FormErrorMessage>Password is required.</FormErrorMessage>}
          </FormControl>
          <Button type="submit" isLoading={isSubmitting} disabled={!isValid}>Login</Button>
        </Stack>
      </form>
    </div>
  )
}

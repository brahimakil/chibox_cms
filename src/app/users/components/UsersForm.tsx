'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Textarea } from '@/components/ui/textarea'

// Form validation schema
const userFormSchema = z.object({
  user_name: z.string().min(1, 'Username cannot be blank.').max(100, 'Username must be 100 characters or less').trim(),
  user_password: z.string().optional(),
  first_name: z.string().max(200, 'First name must be 200 characters or less').trim().optional().or(z.literal('')),
  last_name: z.string().max(200, 'Last name must be 200 characters or less').trim().optional().or(z.literal('')),
  email_address: z.string().email('Invalid email address').max(255, 'Email must be 255 characters or less').optional().or(z.literal('')),
  user_role: z.string().min(1, 'User role is required'),
  country_code: z.string().min(1, 'Country code cannot be blank.').max(100, 'Country code must be 100 characters or less').trim(),
  phone_number_one: z.string().max(20, 'Phone number must be 20 characters or less').trim().optional().or(z.literal('')),
  address: z.string().trim().optional().or(z.literal('')),
  gender: z.enum(['Male', 'Female', 'Others', '']).optional(),
  birth_date: z.string().optional().or(z.literal('')),
  has_related_store: z.enum(['0', '1']),
  description: z.string().trim().optional().or(z.literal('')),
})

type UserFormValues = z.infer<typeof userFormSchema>

interface UsersFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId?: number | null
  onSuccess?: () => void
}

interface UserGroup {
  id: string
  text: string
  description?: string
}

export function UsersForm({ open, onOpenChange, userId, onSuccess }: UsersFormProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingUser, setIsLoadingUser] = useState(false)
  const [userGroups, setUserGroups] = useState<UserGroup[]>([])
  const [isLoadingGroups, setIsLoadingGroups] = useState(false)

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      user_name: '',
      user_password: '',
      first_name: '',
      last_name: '',
      email_address: '',
      user_role: '',
      country_code: '',
      phone_number_one: '',
      address: '',
      gender: '',
      birth_date: '',
      has_related_store: '0',
      description: '',
    },
  })

  // Fetch user groups when dialog opens
  useEffect(() => {
    const fetchUserGroups = async () => {
      if (!open) return
      
      try {
        setIsLoadingGroups(true)
        const response = await fetch('/api/user-groups?limit=100')
        const result = await response.json()

        if (result.results && Array.isArray(result.results)) {
          setUserGroups(result.results)
        } else {
          console.error('Invalid user groups response format:', result)
          toast({
            title: "Warning",
            description: 'Failed to load user groups',
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error('Error fetching user groups:', error)
        toast({
          title: "Warning",
          description: 'Failed to load user groups',
          variant: "destructive",
        })
      } finally {
        setIsLoadingGroups(false)
      }
    }

    if (open) {
      fetchUserGroups()
    }
  }, [open, toast])

  // Fetch user data when editing
  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) return
      
      try {
        setIsLoadingUser(true)
        const response = await fetch(`/api/users/${userId}`)
        const result = await response.json()

        if (result.success && result.user) {
          const user = result.user
          
          // Map API response (camelCase) to form values
          form.reset({
            user_name: user.userName || '',
            user_password: '', // Don't populate password
            first_name: user.firstName || '',
            last_name: user.lastName || '',
            email_address: user.emailAddress || '',
            user_role: user.userRole?.toString() || '',
            country_code: user.countryCode || '',
            phone_number_one: user.phoneNumberOne || '',
            address: user.address || '',
            gender: user.gender || '',
            birth_date: user.birthDate ? new Date(user.birthDate).toISOString().split('T')[0] : '',
            has_related_store: user.hasRelatedStore?.toString() || '0',
            description: user.description || '',
          })
        } else {
          toast({
            title: "Error",
            description: result.error || 'Failed to fetch user data',
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error('Error fetching user:', error)
        toast({
          title: "Error",
          description: 'Failed to fetch user data',
          variant: "destructive",
        })
      } finally {
        setIsLoadingUser(false)
      }
    }

    if (open && userId) {
      fetchUserData()
    } else if (!open) {
      // Reset form when dialog closes
      form.reset({
        user_name: '',
        user_password: '',
        first_name: '',
        last_name: '',
        email_address: '',
        user_role: '',
        country_code: '',
        phone_number_one: '',
        address: '',
        gender: '',
        birth_date: '',
        has_related_store: '0',
        description: '',
      })
    }
  }, [open, userId, form, toast])

  const onFormSubmit = async (data: UserFormValues) => {
    try {
      setIsLoading(true)
      
      const isEditMode = userId !== undefined && userId !== null
      
      // Validate password for new users
      if (!isEditMode && !data.user_password) {
        toast({
          title: "Validation Error",
          description: "Password is required for new users",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      const url = isEditMode
        ? `/api/users/${userId}`
        : '/api/users'
      const method = isEditMode ? 'PUT' : 'POST'

      const requestBody: {
        user_name: string
        user_password?: string
        first_name?: string | null
        last_name?: string | null
        email_address?: string | null
        user_role: number
        country_code: string
        phone_number_one?: string | null
        address?: string | null
        gender?: string | null
        birth_date?: string | null
        has_related_store: number
        description?: string | null
      } = {
        user_name: data.user_name.trim(),
        first_name: data.first_name?.trim() || null,
        last_name: data.last_name?.trim() || null,
        email_address: data.email_address?.trim() || null,
        user_role: parseInt(data.user_role),
        country_code: data.country_code.trim(),
        phone_number_one: data.phone_number_one?.trim() || null,
        address: data.address?.trim() || null,
        gender: data.gender && data.gender.trim() ? data.gender.trim() : null,
        birth_date: data.birth_date ? new Date(data.birth_date).toISOString() : null,
        has_related_store: parseInt(data.has_related_store),
        description: data.description?.trim() || null,
      }

      // Only include password if provided (for edit) or required (for create)
      if (data.user_password && data.user_password.trim()) {
        requestBody.user_password = data.user_password.trim()
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Success",
          description: isEditMode ? 'User updated successfully' : 'User created successfully',
        })
        onSuccess?.()
        onOpenChange(false)
      } else {
        toast({
          title: "Error",
          description: result.error || (isEditMode ? 'Failed to update user' : 'Failed to create user'),
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error saving user:', error)
      toast({
        title: "Error",
        description: 'Failed to save user',
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[900px] w-[90vw] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden"
        showMaximizeButton={true}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30 shrink-0">
          <DialogTitle className="text-2xl font-semibold">
            {userId ? 'Edit User' : 'Create User'}
          </DialogTitle>
        </DialogHeader>

        {isLoadingUser ? (
          <div className="flex items-center justify-center py-16 flex-1 overflow-y-auto">
            <div className="text-muted-foreground">Loading user data...</div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onFormSubmit)} className="flex flex-col h-full min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-muted/30 min-h-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-6">
                    {/* Username Field */}
                    <FormField
                      control={form.control}
                      name="user_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">
                            Username<span className="text-destructive ml-1">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Enter username"
                              className="h-11 bg-background"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Password Field */}
                    <FormField
                      control={form.control}
                      name="user_password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">
                            Password{!userId && <span className="text-destructive ml-1">*</span>}
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              placeholder={userId ? "Leave blank to keep current password" : "Enter password"}
                              className="h-11 bg-background"
                            />
                          </FormControl>
                          {userId && (
                            <p className="text-sm text-muted-foreground">Leave blank to keep current password</p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* First Name Field */}
                    <FormField
                      control={form.control}
                      name="first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">First Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Enter first name"
                              className="h-11 bg-background"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Last Name Field */}
                    <FormField
                      control={form.control}
                      name="last_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">Last Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Enter last name"
                              className="h-11 bg-background"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Email Address Field */}
                    <FormField
                      control={form.control}
                      name="email_address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">Email Address</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              placeholder="Enter email address"
                              className="h-11 bg-background"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* User Role Field */}
                    <FormField
                      control={form.control}
                      name="user_role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">
                            User Role<span className="text-destructive ml-1">*</span>
                          </FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            disabled={isLoadingGroups}
                          >
                            <FormControl>
                              <SelectTrigger className="h-11 bg-background">
                                <SelectValue placeholder={isLoadingGroups ? "Loading groups..." : "Select user role"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {userGroups.length === 0 && !isLoadingGroups ? (
                                <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                                  No user groups available
                                </div>
                              ) : (
                                userGroups.map((group) => (
                                  <SelectItem key={group.id} value={group.id}>
                                    {group.text}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    {/* Birth Date Field */}
                    <FormField
                      control={form.control}
                      name="birth_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">Birth Date</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="date"
                              className="h-11 bg-background"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Phone Number Field */}
                    <FormField
                      control={form.control}
                      name="phone_number_one"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">Phone Number</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Enter phone number"
                              className="h-11 bg-background"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Country Code Field */}
                    <FormField
                      control={form.control}
                      name="country_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">
                            Country Code<span className="text-destructive ml-1">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Enter country code (e.g., US, UK)"
                              className="h-11 bg-background"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Address Field */}
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">Address</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Enter address"
                              className="bg-background min-h-[80px]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Gender Field */}
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">Gender</FormLabel>
                          <FormControl>
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value || undefined}
                            >
                              <SelectTrigger className="h-11 bg-background">
                                <SelectValue placeholder="Choose Gender" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Male">Male</SelectItem>
                                <SelectItem value="Female">Female</SelectItem>
                                <SelectItem value="Others">Others</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Has Related Store Field */}
                    <FormField
                      control={form.control}
                      name="has_related_store"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">
                            Has Related Store<span className="text-destructive ml-1">*</span>
                          </FormLabel>
                          <FormControl>
                            <RadioGroup
                              value={field.value}
                              onValueChange={field.onChange}
                              className="flex gap-6"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="0" id="has-store-false" />
                                <Label htmlFor="has-store-false" className="cursor-pointer">No</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="1" id="has-store-true" />
                                <Label htmlFor="has-store-true" className="cursor-pointer">Yes</Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Description Field - Full Width */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Enter description"
                          className="bg-background min-h-[100px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Footer Actions */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t bg-muted/30 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                  className="h-10 px-6"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="h-10 px-6"
                >
                  {isLoading ? 'Saving...' : userId ? 'Update User' : 'Create User'}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}


import { Category } from '@/app/types/electron'
import { createSlice } from '@reduxjs/toolkit'

export const counterSlice = createSlice({
    name: 'counter',
    initialState: {
        categories: [] as Category[]
    },
    reducers: {
        addCategories: (state, action) => {
            // Redux Toolkit allows us to write "mutating" logic in reducers. It
            // doesn't actually mutate the state because it uses the Immer library,
            // which detects changes to a "draft state" and produces a brand new
            // immutable state based off those changes
            state.categories = action.payload
        },
        addCategory: (state, action) => {
            state.categories.push(action.payload)
        }
    }
})

// Action creators are generated for each case reducer function
export const { addCategories, addCategory } = counterSlice.actions

export default counterSlice.reducer
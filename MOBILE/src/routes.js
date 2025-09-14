import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";

import Main from "./pages/main";
import Login from "./pages/login";
import User from "./pages/user";
import Register from "./pages/register";

const Stack = createStackNavigator();

export default function Routes() {
    return (
        <NavigationContainer>
            <Stack.Navigator>
                <Stack.Screen 
                    name="login" 
                    component={Login} 
                    options={{ headerShown: false }} 
                />
                <Stack.Screen
                    name="main"
                    component={Main}
                    options={{ headerShown: false }} 
                />
                <Stack.Screen
                    name="user"
                    component={User}
                    options={{ headerShown: false }} 
                />
                <Stack.Screen
                    name="register"
                    component={Register}
                    options={{ headerShown: false }} 
                />
            </Stack.Navigator>
        </NavigationContainer>
    )
}

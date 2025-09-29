import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";

import Main from "./pages/main";
import Login from "./pages/login";
import Register from "./pages/register";
import Home from "./pages/home";
import Perfil from "./pages/perfil";

const Stack = createStackNavigator();

export default function Routes() {
    return (
        <NavigationContainer>
            <Stack.Navigator>
                <Stack.Screen
                    name="main"
                    component={Main}
                    options={{ headerShown: false }} 
                />
                <Stack.Screen 
                    name="login" 
                    component={Login} 
                    options={{ headerShown: false }} 
                />
                <Stack.Screen
                    name="register"
                    component={Register}
                    options={{ headerShown: false }} 
                />
                <Stack.Screen
                    name="home"
                    component={Home}
                    options={{ headerShown: false }} 
                />
                <Stack.Screen
                    name="perfil"
                    component={Perfil}
                    options={{ headerShown: false }} 
                />
            </Stack.Navigator>
        </NavigationContainer>
    )
}

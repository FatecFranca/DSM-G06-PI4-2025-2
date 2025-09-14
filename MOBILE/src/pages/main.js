import React, { Component } from 'react';
import { Keyboard, ActivityIndicator } from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import api from "../services/api"
import AsyncStorage from '@react-native-async-storage/async-storage';

import { View, Text } from 'react-native';
import { Container, Input, Form, SubmitButton, List, User, Avatar, Name, Bio, ProfileButton, ProfileButtonText } from '../styles'


export default class Main extends Component {
    state = {
        newUser: "",
        users: [],
        loading: false,
    }

    async componentDidMount() {
        const users = await AsyncStorage.getItem('users');

        if (users) {
            this.setState({ users: JSON.parse(users) });
        }
    }

    componentDidUpdate(_, prevState) {
        const { users } = this.state;

        if (prevState.users !== users) {
            AsyncStorage.setItem('users', JSON.stringify(users));
        }
    }

    handleAddUser = async () => {
        try{
            const { users, newUser } = this.state;
            this.setState({ loading: true });

            const response = await api.get(`users/${newUser}`);
        }catch(error){

        }
    }
}
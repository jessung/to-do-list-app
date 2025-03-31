import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer, useNavigation, useRoute } from '@react-navigation/native';
import { Cell, Separator, TableView } from 'react-native-tableview-simple';
import { createStackNavigator } from '@react-navigation/stack';
import { Button, StyleSheet, Text, TextInput, View, ScrollView, TouchableOpacity, FlatList, SafeAreaView, Image, Platform } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Checkbox from 'expo-checkbox';
import { Calendar } from 'react-native-calendars';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function schedulePushNotification() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "New List/Task Created",
    },
    trigger: null,
  });
}

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      if (!projectId) {
        throw new Error('Project ID not found');
      }
      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;
      console.log(token);
    } catch (e) {
      token = `${e}`;
    }
  } else {
    alert('Must use physical device for Push Notifications');
  }

  return token;
}

let taskData = require('./data.json').taskData;

const List = () => {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [channels, setChannels] = useState([]);
  const [notification, setNotification] = useState(undefined);
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => token && setExpoPushToken(token));

    if (Platform.OS === 'android') {
      Notifications.getNotificationChannelsAsync().then(value => setChannels(value ?? []));
    }
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log(response);
    });

    return () => {
      notificationListener.current &&
        Notifications.removeNotificationSubscription(notificationListener.current);
      responseListener.current &&
        Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  const navigation = useNavigation();

  const [list, setList] = useState('');
  const [key, setKey] = useState('');

  const [refreshFlatlist, setRefreshFlatList] = useState(false);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

  const showDatePicker = () => {
    setDatePickerVisibility(true);
  };

  const hideDatePicker = () => {
    setDatePickerVisibility(false);
  };

  const handleConfirm = (date) => {
    taskData.find((item) => item.key == key).date = String(
      date.toISOString().slice(0, 10)
    );
    hideDatePicker();
  };

  const addList = () => {
    if (list.trim()) {
      taskData.push({ key: taskData.length + 1, title: list, date: '' })
      setList('');
      schedulePushNotification()
    }
  };

  const deleteList = (key) => {
    taskData = taskData.filter((item) => item.key != key);
    setRefreshFlatList(!refreshFlatlist);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Add new list"
          value={list}
          onChangeText={setList}
        />
        <Button
          title="Add List"
          onPress={() => {
            addList();
            hideDatePicker();
          }}
        />
      </View>

      <ScrollView>
        <TableView style={{ flex: 1 }}>
          <FlatList
            extraData={refreshFlatlist}
            scrollEnabled={false}
            data={taskData}
            keyExtractor={(item) => item.key}
            renderItem={({ item }) => (
              <Cell
                backgroundColor="transparent"
                height="290px"
                highlightUnderlayColor="#ccc"
                cellContentView={
                  <View style={styles.row}>
                    <Text style={{ fontSize: 17, fontWeight: 'bold', textAlign: 'left', }}
                      onPress={() => navigation.navigate('Task', item.key)}>
                      {item.title}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <TouchableOpacity onPress={() => { showDatePicker(); setKey(item.key); }}>
                        {item.date == '' ? (
                          <Text style={{ color: 'blue' }}>select date</Text>
                        ) : (
                          <Text style={{ color: 'blue' }}>{item.date}</Text>
                        )}
                      </TouchableOpacity>
                      <DateTimePickerModal
                        isVisible={isDatePickerVisible}
                        mode="date"
                        onConfirm={handleConfirm}
                        onCancel={hideDatePicker}
                      />
                      <Button onPress={() => deleteList(item.key)} title="delete" color="red" />
                    </View>
                  </View>
                }
              />
            )}
            ItemSeparatorComponent={({ highlighted }) => (
              <Separator isHidden={highlighted} />
            )}
          />
        </TableView>
      </ScrollView>
      <TouchableOpacity activeOpacity={0.5} style={styles.calendarButton} onPress={() => navigation.navigate('CalendarPage')}>
        <Image style={{ width: 60, height: 60 }} source={require('./assets/calendar.png')} />
      </TouchableOpacity>
    </View>
  );
};

const Task = () => {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [channels, setChannels] = useState([]);
  const [notification, setNotification] = useState(undefined);
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => token && setExpoPushToken(token));

    if (Platform.OS === 'android') {
      Notifications.getNotificationChannelsAsync().then(value => setChannels(value ?? []));
    }
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log(response);
    });

    return () => {
      notificationListener.current &&
        Notifications.removeNotificationSubscription(notificationListener.current);
      responseListener.current &&
        Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  const route = useRoute();

  let list = taskData.find((item) => item.key == route.params);

  const [task, setTask] = useState('');
  const [refreshFlatlist, setRefreshFlatList] = useState(false);
  const [isChecked, setChecked] = useState(false);

  const addTask = () => {
    if (task.trim()) {
      if (list.tasks === undefined) {
        taskData.filter((item) => item.key == route.params)[0].tasks = [
          { key: 1, text: task, completed: false },
        ];
      } else {
        taskData
          .filter((item) => item.key == route.params)[0]
          .tasks.push({
            key: list.tasks.length + 1,
            text: task,
            completed: false,
          });
      }
      schedulePushNotification()
    }
    setTask('');
  };

  const deleteTask = (key) => {
    taskData.filter((item) => item.key == route.params)[0].tasks = taskData
      .filter((item) => item.key == route.params)[0]
      .tasks.filter((item) => item.key != key);
    setRefreshFlatList(!refreshFlatlist);
  };

  // NOT WORKING
  const toggleTask = (task, key) => {
    if (task.complete) {
      taskData
        .find((item) => item.key == route.params)[0]
        .tasks.find((item) => item.key == key).complete = false;
    } else {
      taskData
        .find((item) => item.key == route.params)[0]
        .tasks.find((item) => item.key == key).complete = true;
    }
    console.log(taskData.find((item) => item.key == route.params)[0].tasks);
  };

  return (
    <View>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Add new task"
          value={task}
          onChangeText={setTask}
        />
        <Button title="Add Task" onPress={addTask} />
      </View>
      {list.tasks === undefined ? null : (
        <ScrollView>
          <SafeAreaView style={{ flex: 1 }}>
            <FlatList
              extraData={refreshFlatlist}
              scrollEnabled={false}
              data={list.tasks}
              keyExtractor={(item) => item.key}
              renderItem={({ item }) => (
                <Cell
                  backgroundColor="transparent"
                  height="290px"
                  highlightUnderlayColor="#ccc"
                  cellContentView={
                    <View style={styles.row}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Checkbox
                          key={item.key}
                          style={styles.checkbox}
                          value={item.completed}
                          onChange={(item) => toggleTask(item, item.key)}
                        />
                        {item.completed ? (
                          <Text style={{ fontSize: 17, textAlign: 'center', textDecorationLine: 'line-through', }}>
                            {item.text}
                          </Text>
                        ) : (
                          <Text style={{ fontSize: 17, textAlign: 'center' }}>
                            {item.text}
                          </Text>
                        )}
                      </View>
                      <Button onPress={() => deleteTask(item.key)} title="delete" color="red" />
                    </View>
                  }
                />
              )}
              ItemSeparatorComponent={({ highlighted }) => (
                <Separator isHidden={highlighted} />
              )}
            />
          </SafeAreaView>
        </ScrollView>
      )}
    </View>
  );
};

const CalendarPage = () => {
  const navigation = useNavigation();
  const [selected, setSelected] = useState('');

  let selectedDates = {
    [selected]: { selected: true, disableTouchEvent: true },
  };

  let filterData = taskData.map(e => Object.assign({}, e)).filter(item => item.date === selected)

  useEffect(() => {
    console.log(filterData);
  }, [filterData]);

  return (
    <View>
      <Calendar
        onDayPress={(day) => { setSelected(day.dateString) }}
        markedDates={selectedDates}
      />
      <ScrollView>
        <TableView style={{ flex: 1 }}>
          <FlatList
            scrollEnabled={false}
            data={filterData}
            keyExtractor={(item) => item.key}
            renderItem={({ item }) => (
              <Cell
                backgroundColor="transparent"
                height="290px"
                highlightUnderlayColor="#ccc"
                onPress={() => navigation.navigate('Task', item.key)}
                cellContentView={
                  <View style={styles.row}>
                    <Text style={{ fontSize: 17, fontWeight: 'bold', textAlign: 'center' }}
                    onPress={() => navigation.navigate('Task', item.key)}>
                      {item.title}
                    </Text>
                    <Button onPress={() => deleteList(item.key)} title="delete" color="red" />
                  </View>
                }
              />
            )}
            ItemSeparatorComponent={({ highlighted }) => (
              <Separator isHidden={highlighted} />
            )}
          />
        </TableView>
      </ScrollView>
    </View>
  );
};

const Stack = createStackNavigator();
const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="List"
          component={List}
          options={{ title: 'Lists', headerTitleAlign: 'center' }}
        />
        <Stack.Screen
          name="Task"
          component={Task}
          options={{ title: 'Tasks', headerTitleAlign: 'center' }}
        />
        <Stack.Screen
          name="CalendarPage"
          component={CalendarPage}
          options={{ title: 'Calendar', headerTitleAlign: 'center' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    // height: 40,
    padding: 10,
    margin: 10,
    backgroundColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    height: 40,
    paddingHorizontal: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  calendarButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
  },
});

export default App;
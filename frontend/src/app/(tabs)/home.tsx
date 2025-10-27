import React, { useState, useEffect, useRef } from 'react';
import { 
    View, Text, TextInput, FlatList, StyleSheet, 
    TouchableOpacity, KeyboardAvoidingView, Platform, Dimensions 
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Send, PhoneCall } from 'lucide-react-native';

// Define the shape of a chat message
interface Message {
    id: number;
    username: string;
    content: string;
    timestamp: string;
    isUser: boolean; 
    initial: string;
}

// Initial mock data
const chatDataMock: Message[] = [
    { id: 1, username: 'John Doe', content: 'Hey everyone! How is everyone doing?', timestamp: '10:30 AM', isUser: false, initial: 'J' },
    { id: 2, username: 'You', content: "I'm doing great! Just finished the project.", timestamp: '10:32 AM', isUser: true, initial: 'Y' },
    { id: 3, username: 'Jane Smith', content: "That's awesome! Can you share the details?", timestamp: '10:33 AM', isUser: false, initial: 'J' },
    { id: 4, username: 'You', content: 'Sure! I\'ll send it over shortly.', timestamp: '10:35 AM', isUser: true, initial: 'Y' },
];

const STORAGE_KEY = '@SafeTapChatMessages';
const MAX_CHAT_WIDTH = 600; // Constrain the chat view for desktop

// --- Chat Logic and UI ---
const ChatScreen: React.FC = () => {
    const theme = useTheme();
    const [messages, setMessages] = useState<Message[]>(chatDataMock);
    const [inputMessage, setInputMessage] = useState('');
    const flatListRef = useRef<FlatList<Message>>(null);
    const { width } = Dimensions.get('window');

    // 1. Load messages from local storage on initial mount
    useEffect(() => {
        // Check if we are in a web environment where localStorage exists
        if (typeof localStorage !== 'undefined') {
            try {
                const storedMessages = localStorage.getItem(STORAGE_KEY);
                if (storedMessages) {
                    setMessages(JSON.parse(storedMessages));
                } else {
                    // If no messages exist, store the initial mock data
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(chatDataMock));
                }
            } catch (error) {
                console.error("Error loading messages from localStorage:", error);
            }
        }
    }, []);

    // 2. Save messages to local storage whenever they change
    useEffect(() => {
        if (typeof localStorage !== 'undefined') {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
                // Auto-scroll on new message
                if (flatListRef.current) {
                    flatListRef.current.scrollToEnd({ animated: true });
                }
            } catch (error) {
                console.error("Error saving messages to localStorage:", error);
            }
        }
    }, [messages]);


    // --- FUNCTIONALITY: Send Message ---
    const sendMessage = () => {
        if (inputMessage.trim() === '') return;

        const newMessage: Message = {
            id: Date.now(),
            username: 'You',
            content: inputMessage.trim(),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isUser: true,
            initial: 'Y'
        };

        setMessages(prevMessages => [...prevMessages, newMessage]);
        setInputMessage('');
    };

    // --- UI Helper Functions ---
    const renderMessage = ({ item }: { item: Message }) => {
        const isSelf = item.isUser;
        
        const bubbleColor = isSelf ? '#1E90FF' : theme.colors.card; // Cyan-blue for self
        // Reverse layout for self-messages to put the avatar on the right
        const alignmentStyle = isSelf ? styles.selfContainer : styles.otherContainer; 

        return (
            <View style={[styles.messageContainer, alignmentStyle]}>
                
                {/* Avatar (Position is handled by alignmentStyle) */}
                <View style={[
                    styles.avatarContainer, 
                    { backgroundColor: theme.colors.primary }, 
                    isSelf ? { marginLeft: 8 } : { marginRight: 8 } // Spacing
                ]}>
                    <Text style={styles.avatarText}>{item.initial}</Text>
                </View>
                
                <View style={styles.bubbleContent}>
                    {/* Sender Name (Only visible for others) */}
                    {!isSelf && (
                        <Text style={[styles.usernameText, { color: theme.colors.text }]}>
                            {item.username}
                        </Text>
                    )}

                    <View style={[styles.bubble, { backgroundColor: bubbleColor }, isSelf ? styles.selfBubble : styles.otherBubble]}>
                        <Text style={styles.messageText}>{item.content}</Text>
                        <Text style={[styles.timeText, { color: isSelf ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.5)' }]}>
                            {item.timestamp}
                        </Text>
                    </View>
                </View>
                
            </View>
        );
    };

    // Apply max width to the main content wrapper for desktop view
    const mainContentStyle: any = {
        width: '100%',
        maxWidth: width > MAX_CHAT_WIDTH ? MAX_CHAT_WIDTH : '100%',
        alignSelf: 'center', // Center the constrained view
    };

    // --- Main Render ---
    return (
        <KeyboardAvoidingView
            style={[styles.keyboardContainer, { backgroundColor: theme.colors.background }]}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 20}
        >
            <View style={[styles.mainWrapper, { backgroundColor: theme.colors.background }]}>
                {/* Responsive Content Container */}
                <View style={mainContentStyle}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerTitleContainer}>
                            <PhoneCall color={theme.colors.text} size={24} />
                            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>SafeTap</Text>
                        </View>
                        <Text style={styles.headerSubtitle}>ONE TAP TO SAFETY</Text>
                    </View>
                    
                    <Text style={[styles.chatAreaTitle, { color: theme.colors.text }]}>Chat Area</Text>
                </View>

                {/* FlatList (Needs to span full width to handle centering of messages) */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderMessage}
                    contentContainerStyle={[styles.listContent, { maxWidth: MAX_CHAT_WIDTH, alignSelf: 'center' }]}
                    style={{ flex: 1, width: '100%' }}
                />

                {/* Input Bar Wrapper (Applies max width for centering) */}
                <View style={mainContentStyle}>
                    <View style={[styles.inputContainer, { backgroundColor: theme.colors.card }]}>
                        <TextInput
                            style={[styles.textInput, { 
                                backgroundColor: theme.colors.background, 
                                color: theme.colors.text 
                            }]}
                            value={inputMessage}
                            onChangeText={setInputMessage}
                            placeholder="Type a message..."
                            placeholderTextColor="gray"
                            multiline
                        />
                        <TouchableOpacity 
                            style={styles.sendButton} 
                            onPress={sendMessage}
                        >
                            <Send 
                                name="send" 
                                size={24} 
                                color="white" 
                                style={{ transform: [{ rotate: '-45deg' }] }}
                            />
                        </TouchableOpacity>
                    </View>
                </View>

            </View>
        </KeyboardAvoidingView>
    );
};

// --- Styling ---
const styles = StyleSheet.create({
    keyboardContainer: {
        flex: 1,
    },
    mainWrapper: {
        flex: 1,
        alignItems: 'center', // Center the content horizontally
        width: '100%',
    },
    header: {
        paddingVertical: 15,
        alignItems: 'center',
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#ccc',
        marginBottom: 10,
    },
    chatAreaTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 15,
        marginBottom: 10,
    },
    listContent: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        width: '100%', // Ensure it uses the max-width context of the FlatList style prop
    },
    messageContainer: {
        flexDirection: 'row',
        marginVertical: 4,
        alignItems: 'flex-end',
    },
    selfContainer: {
        justifyContent: 'flex-end',
        marginLeft: 'auto',
        flexDirection: 'row-reverse', // Key to placing avatar on the right
    },
    otherContainer: {
        justifyContent: 'flex-start',
        marginRight: 'auto',
    },
    avatarContainer: {
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1E90FF', // Use primary color for avatar background
    },
    avatarText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    bubbleContent: {
        maxWidth: '80%',
    },
    bubble: {
        padding: 10,
        borderRadius: 12,
    },
    selfBubble: {
        borderTopRightRadius: 2, // Sharp corner facing user avatar
    },
    otherBubble: {
        borderTopLeftRadius: 2, // Sharp corner facing other avatar
    },
    usernameText: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 2,
        marginLeft: 10,
    },
    messageText: {
        fontSize: 15,
        color: '#FFFFFF',
    },
    timeText: {
        fontSize: 10,
        marginTop: 5,
        textAlign: 'right',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    textInput: {
        flex: 1,
        minHeight: 40,
        maxHeight: 100,
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingTop: 10,
        paddingBottom: 10,
        fontSize: 16,
        marginRight: 10,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1E90FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default ChatScreen;


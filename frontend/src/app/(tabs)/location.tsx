import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { MapPin, Icon } from 'lucide-react-native';

// Interface to define the props for the reusable screen component
interface PlaceholderProps {
    title: string;
    icon: Icon;
    description: string;
}

// Reusable component for all non-chat tabs
const PlaceholderScreen: React.FC<PlaceholderProps> = ({ title, icon: Icon, description }) => {
    const theme = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Icon color={theme.colors.primary} size={64} style={styles.icon} />
            <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
            <Text style={[styles.description, { color: theme.colors.text }]}>{description}</Text>
        </View>
    );
};

const LocationScreen = () => (
    <PlaceholderScreen 
        title="Live Location Tracking"
        icon={MapPin}
        description="This screen will display the real-time map and location of all group members, essential for safety."
    />
);
export default LocationScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    icon: {
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        textAlign: 'center',
        paddingHorizontal: 20,
        opacity: 0.8,
    },
});

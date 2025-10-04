"use client"

export class VoiceCommandProcessor {
  static processBasicCommand(command: string): string | null {
    const lowerCommand = command.toLowerCase().trim();
    
    // Time commands
    if (lowerCommand.includes('time') || lowerCommand.includes('what time')) {
      return this.getTimeResponse();
    }
    
    // Date commands
    if (lowerCommand.includes('date') || lowerCommand.includes('what date') || lowerCommand.includes('today\'s date')) {
      return this.getDateResponse();
    }
    
    // Greetings
    if (lowerCommand.includes('hello') || lowerCommand.includes('hi') || lowerCommand.includes('hey')) {
      return this.getGreetingResponse();
    }
    
    // How are you
    if (lowerCommand.includes('how are you') || lowerCommand.includes('how do you do')) {
      return "I'm doing great! Ready to help you be more productive. What can I do for you?";
    }
    
    // Thank you
    if (lowerCommand.includes('thank') || lowerCommand.includes('thanks')) {
      return "You're welcome! Happy to help. Is there anything else you need?";
    }
    
    return null;
  }

  static getTimeResponse(): string {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes.toString().padStart(2, '0');
    
    // Add some variety to responses
    const responses = [
      `It's ${formattedHours}:${formattedMinutes} ${ampm}`,
      `The time is ${formattedHours}:${formattedMinutes} ${ampm}`,
      `Right now it's ${formattedHours}:${formattedMinutes} ${ampm}`,
      `Currently, it's ${formattedHours}:${formattedMinutes} ${ampm}`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  static getDateResponse(): string {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    
    const responses = [
      `Today is ${today.toLocaleDateString('en-US', options)}`,
      `It's ${today.toLocaleDateString('en-US', options)}`,
      `The date is ${today.toLocaleDateString('en-US', options)}`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  static getGreetingResponse(): string {
    const hour = new Date().getHours();
    let timeOfDay = '';
    
    if (hour < 12) timeOfDay = 'morning';
    else if (hour < 17) timeOfDay = 'afternoon';
    else timeOfDay = 'evening';
    
    const responses = [
      `Good ${timeOfDay}! How can I help you today?`,
      `Hello there! Good ${timeOfDay}. What would you like to do?`,
      `Hi! Good ${timeOfDay}. Ready to be productive?`,
      `Hey! Good ${timeOfDay}. How can I assist you?`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }
}
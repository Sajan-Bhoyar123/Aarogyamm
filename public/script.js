document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("chat-form");
    const chatBox = document.getElementById("chat-box");
    const inputField = document.getElementById("message");

    if (!form || !chatBox || !inputField) {
        return; // Exit if chat elements don't exist
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const message = inputField.value.trim();

        if (!message) return;

        // Display user message
        appendMessage("user", message);
        inputField.value = "";

        try {
            // Determine the correct chat endpoint based on current URL
            const currentPath = window.location.pathname;
            const chatEndpoint = currentPath.includes('/doctor/') ? '/doctor/chat' : '/patient/chat';
            
            // Send request to server
            const response = await fetch(chatEndpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message }),
            });

            const data = await response.json();
            
            if (data.error) {
                appendMessage("bot", "Sorry, there was an error processing your message. Please try again.");
                return;
            }

            // Display bot response
            appendMessage("bot", data.response);
        } catch (error) {
            console.error("Error:", error);
            appendMessage("bot", "I'm having trouble connecting right now. Please try again in a moment.");
        }
    });

    function appendMessage(sender, text) {
        const messageDiv = document.createElement("div");
        messageDiv.classList.add(sender === "user" ? "user-message" : "bot-message");
        messageDiv.innerText = text;
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }
});

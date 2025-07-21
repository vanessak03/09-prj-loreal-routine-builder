/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

// Load selected products from localStorage if available
let selectedProducts = [];
const savedProducts = localStorage.getItem('selectedProducts');
if (savedProducts) {
  try {
    selectedProducts = JSON.parse(savedProducts);
  } catch (e) {
    selectedProducts = [];
  }
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(product => {
      const isSelected = selectedProducts.some(p => p.id === product.id);
      return `
        <div class="product-card${isSelected ? ' selected' : ''}" data-id="${product.id}">
          <img src="${product.image}" alt="${product.name}">
          <div class="product-info">
            <h3>${product.name}</h3>
            <p>${product.brand}</p>
          </div>
          <div class="product-desc-overlay">
            ${product.description}
          </div>
        </div>
      `;
    })
    .join("");

  // Add click listeners to each card
  document.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-id');
      const product = products.find(p => p.id == id);
      toggleProductSelection(product, products);
    });
  });
}

// Toggle selection
// Add or remove a product from selection and update localStorage
function toggleProductSelection(product, products) {
  const index = selectedProducts.findIndex(p => p.id === product.id);
  if (index === -1) {
    selectedProducts.push(product);
  } else {
    selectedProducts.splice(index, 1);
  }
  // Save to localStorage
  localStorage.setItem('selectedProducts', JSON.stringify(selectedProducts));
  displayProducts(products); // re-render grid
  updateSelectedProducts(products);
}

// Update the “Selected Products” section
function updateSelectedProducts(products) {
  const selectedDiv = document.getElementById('selectedProductsList');
  if (selectedProducts.length === 0) {
    selectedDiv.innerHTML = '<div class="placeholder-message">No products selected.</div>';
    // Remove clear all button if present
    const clearBtn = document.getElementById('clearAllBtn');
    if (clearBtn) clearBtn.remove();
    return;
  }
  selectedDiv.innerHTML = selectedProducts
    .map(product => `
      <div>
        ${product.name}
        <button class="remove-btn" data-id="${product.id}">Remove</button>
      </div>
    `)
    .join("");

  // Add remove listeners
  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // prevent card click
      const id = btn.getAttribute('data-id');
      const product = selectedProducts.find(p => p.id == id);
      toggleProductSelection(product, products);
    });
  });

  // Add "Clear All" button if not present
  if (!document.getElementById('clearAllBtn')) {
    const clearBtn = document.createElement('button');
    clearBtn.id = 'clearAllBtn';
    clearBtn.textContent = 'Clear All';
    clearBtn.className = 'remove-btn';
    clearBtn.style.marginTop = '10px';
    clearBtn.addEventListener('click', () => {
      selectedProducts = [];
      localStorage.removeItem('selectedProducts');
      displayProducts(products);
      updateSelectedProducts(products);
    });
    selectedDiv.parentNode.insertBefore(clearBtn, selectedDiv.nextSibling);
  }
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  // filter() creates a new array containing only products where the category matches what the user selected
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
  updateSelectedProducts(filteredProducts);
});



// Store chat history for follow-up questions
let chatHistory = [
  { role: 'system', content: 'You are a helpful beauty advisor. Only answer questions about the generated routine, skincare, haircare, makeup, fragrance, or other beauty-related topics. If a question is off-topic, politely guide the user back to beauty and routine advice. Always use the full conversation history for context.' }
];

// Handle Generate Routine button click
const generateBtn = document.getElementById('generateRoutine');
generateBtn.addEventListener('click', async () => {
  // Collect selected products' info
  const productsToSend = selectedProducts.map(p => ({
    name: p.name,
    brand: p.brand,
    category: p.category,
    description: p.description
  }));

  // Add user message to chat history
  chatHistory.push({ role: 'user', content: `Here are my selected products: ${JSON.stringify(productsToSend)}. Please generate a personalized routine using only these products.` });

  // Show user message and loading in chat window
  chatWindow.innerHTML =
    chatHistory
      .filter(msg => msg.role !== 'system')
      .map(msg =>
        msg.role === 'user'
          ? `<div class="chat-bubble user">${msg.content.replace(/\n/g, '<br>')}</div>`
          : `<div class="chat-bubble bot">${msg.content.replace(/\n/g, '<br>')}</div>`
      )
      .join('') +
    '<div class="placeholder-message">Generating your personalized routine...</div>';

  try {
    const response = await fetch('https://loreal-worker.steven87.workers.dev/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: chatHistory
      })
    });
    const data = await response.json();
    if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
      // Add bot response to chat history
      chatHistory.push({ role: 'assistant', content: data.choices[0].message.content });
      // Show full chat in chat window
      chatWindow.innerHTML =
        chatHistory
          .filter(msg => msg.role !== 'system')
          .map(msg =>
            msg.role === 'user'
              ? `<div class="chat-bubble user">${msg.content.replace(/\n/g, '<br>')}</div>`
              : `<div class="chat-bubble bot">${msg.content.replace(/\n/g, '<br>')}</div>`
          )
          .join('');
    } else {
      chatWindow.innerHTML += '<div class="placeholder-message">Sorry, I could not generate a routine. Please try again.</div>';
    }
  } catch (error) {
    chatWindow.innerHTML += '<div class="placeholder-message">Error connecting to OpenAI. Please try again later.</div>';
  }
  // Clear input
  document.getElementById('userInput').value = '';
});


// Chat form submission handler for follow-up questions
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const userInput = document.getElementById('userInput').value;
  if (!userInput.trim()) return;

  // Add user message to chat history
  chatHistory.push({ role: 'user', content: userInput });

  // Show user message and loading in chat window
  chatWindow.innerHTML =
    chatHistory
      .filter(msg => msg.role !== 'system')
      .map(msg =>
        msg.role === 'user'
          ? `<div class="chat-bubble user">${msg.content.replace(/\n/g, '<br>')}</div>`
          : `<div class="chat-bubble bot">${msg.content.replace(/\n/g, '<br>')}</div>`
      )
      .join('') +
    '<div class="placeholder-message">Thinking...</div>';

  // Send updated chat history to OpenAI
  try {
    const response = await fetch('https://loreal-worker.steven87.workers.dev/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: chatHistory
      })
    });
    const data = await response.json();
    if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
      chatHistory.push({ role: 'assistant', content: data.choices[0].message.content });
      // Show full chat in chat window
      chatWindow.innerHTML =
        chatHistory
          .filter(msg => msg.role !== 'system')
          .map(msg =>
            msg.role === 'user'
              ? `<div class="chat-bubble user">${msg.content.replace(/\n/g, '<br>')}</div>`
              : `<div class="chat-bubble bot">${msg.content.replace(/\n/g, '<br>')}</div>`
          )
          .join('');
    } else {
      chatWindow.innerHTML += '<div class="placeholder-message">Sorry, I could not answer that. Please try again.</div>';
    }
  } catch (error) {
    chatWindow.innerHTML += '<div class="placeholder-message">Error connecting to OpenAI. Please try again later.</div>';
  }
  // Clear input
  document.getElementById('userInput').value = '';
});
// On page load, if a category is already selected, show products and update selected list
window.addEventListener('DOMContentLoaded', async () => {
  const products = await loadProducts();
  const selectedCategory = categoryFilter.value;
  if (selectedCategory) {
    const filteredProducts = products.filter(
      (product) => product.category === selectedCategory
    );
    displayProducts(filteredProducts);
    updateSelectedProducts(filteredProducts);
  } else {
    updateSelectedProducts(products);
  }
});

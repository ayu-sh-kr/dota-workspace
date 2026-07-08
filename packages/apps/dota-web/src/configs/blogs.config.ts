
export type BlogCategory = "Rant" | "Tutorial" | "News" | "Tools" | "Others"
export const BlogIcons: Record<BlogCategory, string> = {
  Rant: "mdi:comment-outline",
  Tutorial: "mdi:book-open-variant",
  News: "mdi:newspaper-variant",
  Tools: "mdi:wrench-outline",
  Others: "mdi:dots-horizontal"
}

export type BlogIconDetails = {
  category: BlogCategory
  icon: string,
  color?: string,
  variant?: string,
}


export const BlogTypeConfig: Record<BlogCategory, BlogIconDetails> = {
  Rant: {
    category: "Rant",
    icon: BlogIcons.Rant,
    color: "orange",
  },

  Tutorial: {
    category: "Tutorial",
    icon: BlogIcons.Tutorial,
    color: "blue",
  },

  News: {
    category: "News",
    icon: BlogIcons.News,
    color: "green",
  },

  Tools: {
    category: "Tools",
    icon: BlogIcons.Tools,
    color: "purple",
  },

  Others: {
    category: "Others",
    icon: BlogIcons.Others,
    color: "gray",
  }
}

export type Blog = {
  header: string;
  description: string;
  date: string;
  writer: string;
  category: BlogCategory;
  path: string
  imageUrl?: string;
  content?: string;
  tags?: string[];
  link?: string;
}

const normalizeBlogPath = (path: string): string => {
  return path
    .trim()
    .replace(/^\/+/, "")
    .replace(/\.md$/i, "")
    .toLowerCase();
};

const isSameBlog = (left: string, right: string): boolean => {
  return normalizeBlogPath(left) === normalizeBlogPath(right);
};

const getStableIndex = (value: string, size: number): number => {
  if (size <= 0) {
    return 0;
  }

  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }

  return Math.abs(hash) % size;
};

export const getSuggestedBlogPosts = (currentPath: string, limit: number = 3): Blog[] => {
  if (!blogPosts.length || limit <= 0) {
    return [];
  }

  const normalizedCurrentPath = normalizeBlogPath(currentPath);
  if (!normalizedCurrentPath) {
    return [];
  }

  const currentIndex = blogPosts.findIndex(post => isSameBlog(post.path, currentPath));
  const availablePosts = blogPosts.filter(post => !isSameBlog(post.path, currentPath));

  if (availablePosts.length === 0) {
    return [];
  }

  const suggestedPosts: Blog[] = [];

  if (currentIndex !== -1) {
    for (let offset = 1; offset < blogPosts.length && suggestedPosts.length < limit; offset += 1) {
      const nextPost = blogPosts[(currentIndex + offset) % blogPosts.length];
      if (isSameBlog(nextPost.path, currentPath)) {
        continue;
      }
      suggestedPosts.push(nextPost);
    }
  } else {
    const startIndex = normalizedCurrentPath
      ? getStableIndex(normalizedCurrentPath, availablePosts.length)
      : 0;

    for (let offset = 0; offset < availablePosts.length && suggestedPosts.length < limit; offset += 1) {
      const nextPost = availablePosts[(startIndex + offset) % availablePosts.length];
      suggestedPosts.push(nextPost);
    }
  }

  return suggestedPosts.slice(0, limit);
};

export const blogPosts: Blog[] = [
  {
    date: '2025-04-21',
    writer: 'Ayush Jaiswal',
    header: 'Head first Web Components',
    description: "Lets explore the world of web components, a powerful technology that enables developers to create reusable and encapsulated custom elements. This article delves into the fundamentals of web components, including shadow DOM, custom elements, and HTML templates. By understanding these concepts, developers can build modular and maintainable applications that enhance user experience and streamline development processes.",
    category: "Tutorial",
    path: "Web-Component.md",
  },

  {
    "date": '2025-04-21',
    "writer": 'Ayush Jaiswal',
    "header": 'What is needed to design a web component',
    "description": "In this article, we will explore the essential components required to design a web component. We will discuss the key concepts and technologies involved in creating reusable and encapsulated custom elements. By understanding these components, developers can effectively leverage web components to enhance their web applications.",
    "category": "Tutorial",
    "path": "Component-Basic.md",
  },

  {
    "date": "2025-04-22",
    "writer": "Ayush Jaiswal",
    "header": "What's next in Dota Core",
    "description": "This article explores the upcoming release of dota core, a powerful framework for building scalable and efficient applications. It delves into the new features and enhancements that will be introduced, including improved performance, enhanced developer experience, and expanded capabilities. By understanding what's next in Dota Core, developers can stay ahead of the curve and leverage the latest advancements in their projects.",
    "category": "News",
    "path": "Next-in-Dota-Core.md",
  },

  {
    date: "2025-04-22",
    writer: "Ayush Jaiswal",
    "header": "Window Port exlusion Issue",
    "description": "This article addresses the window port exclusion issue, a common challenge faced by developers when working with web applications. It provides insights into the causes of this issue and offers practical solutions to mitigate its impact. By understanding the window port exclusion issue, developers can enhance the performance and reliability of their applications.",
    category: "Rant",
    "path": "Window-Port-Exclusion-Issue.md",
  },

  {
    date: "2025-04-23",
    writer: "Ayush Jaiswal",
    header: "Scripting Languages",
    description: "A practical overview of scripting languages, their strengths, and common use cases across automation, web development, data work, and embedded systems.",
    category: "Tools",
    path: "Scripting-Languages.md",
  },

  {
    date: "2025-04-24",
    writer: "Ayush Jaiswal",
    header: "Kotlin For Scripting",
    description: "An introduction to using Kotlin as a scripting language, with a focus on concise automation, JVM tooling, and practical use cases.",
    category: "Tools",
    path: "Kotlin-For-Scripting.md",
  },
  {
    date: "2025-04-25",
    writer: "Ayush Jaiswal",
    header: "Data Encryption Standard",
    description: "An introduction to DES, a symmetric encryption algorithm that encrypts data in 64-bit blocks using a 56-bit key via the Feistel Network across 16 rounds of substitution and permutation.",
    category: "Tutorial",
    path: "DES.md",
  },
  {
    date: "2025-04-25",
    writer: "Ayush Jaiswal",
    header: "Advanced Encryption Standard",
    description: "A short introduction to AES, a widely used symmetric-key encryption standard for securing data at rest and in transit.",
    category: "Tutorial",
    path: "AES.md",
  },
  {
    date: "2025-04-25",
    writer: "Ayush Jaiswal",
    header: "Towards Cryptography",
    description: "An introduction to cryptography, covering its purpose, the basic working model, and a simple example using the Caesar cipher.",
    category: "Tutorial",
    path: "Towards-Cryptography.md",
  }
];
